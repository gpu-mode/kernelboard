from flask import Blueprint
from datetime import datetime, timezone
from kernelboard.lib.db import get_db_connection
from kernelboard.lib.status_code import http_success


leaderboard_metadata_bp = Blueprint(
    "leaderboard_metadata_bp", __name__, url_prefix="/leaderboard-metadata"
)


@leaderboard_metadata_bp.route("", methods=["GET"])
def index():
    # Get a list of JSON objects like the following
    # to build the active leaderboard tiles:
    # {
    #     "id": 339,
    #     "name": "conv2d",
    #     "deadline": "2025-04-29T17:00:00-07:00",
    #     "gpu_types": ["L4", "T4"],
    #     "priority_gpu_type": "L4",
    #     "top_users": [
    #         {
    #             "rank": 1,
    #             "score": 0.123
    #             "user_name": "alice"
    #         }, ...
    #     ],
    # }

    conn = get_db_connection()
    query = _get_query()
    with conn.cursor() as cur:
        cur.execute(query)
        leaderboards = [row[0] for row in cur.fetchall()]

    for lb in leaderboards:
        if lb["gpu_types"] is None:
            lb["gpu_types"] = []

    return http_success(
        {"leaderboards": leaderboards, "now": datetime.now(timezone.utc)}
    )


def _get_query():
    query = """
        WITH

        -- Get basic information about active leaderboards.
        active_leaderboards AS (
            SELECT id, name, deadline FROM leaderboard.leaderboard
        ),

        -- Get all the GPU types for each leaderboard.
        gpu_types AS (
            SELECT DISTINCT leaderboard_id, gpu_type FROM leaderboard.gpu_type
            WHERE leaderboard_id IN (SELECT id FROM active_leaderboards)
        ),

        -- Get the "highest priority" GPU type for each leaderboard.
        priority_gpu_types AS (
            SELECT leaderboard_id, gpu_type FROM (
                SELECT
                    leaderboard_id,
                    gpu_type,
                    -- Assign priority based on the how "capable" GPT-4o thought
                    -- various GPU types were.
                    ROW_NUMBER() OVER (
                        PARTITION BY leaderboard_id
                        ORDER BY
                            CASE gpu_type
                                WHEN 'B200' THEN 1
                                WHEN 'H100' THEN 2
                                WHEN 'MI300' THEN 3
                                WHEN 'A100' THEN 4
                                WHEN 'L4'   THEN 5
                                WHEN 'T4'   THEN 6
                                ELSE 7 -- Lowest priority for any other type.
                            END ASC,
                            gpu_type ASC
                    ) as rn
                FROM leaderboard.gpu_type
                WHERE leaderboard_id IN (SELECT id FROM active_leaderboards)
            ) ranked_gpu_types
            WHERE rn = 1
        ),

        -- Get each user's best run for each GPU type (runner) on the active
        -- leaderboards.
        personal_best_candidates AS (
            SELECT r.runner AS runner,
                s.leaderboard_id AS leaderboard_id,
                u.user_name AS user_name,
                r.score AS score,
                RANK() OVER (PARTITION BY s.leaderboard_id, r.runner, u.id
                ORDER BY r.score ASC) AS personal_submission_rank
            FROM leaderboard.runs r
                JOIN leaderboard.submission s ON r.submission_id = s.id
                JOIN active_leaderboards a ON s.leaderboard_id = a.id
                JOIN priority_gpu_types p on p.leaderboard_id = a.id
                    AND p.gpu_type = r.runner
                LEFT JOIN leaderboard.user_info u ON s.user_id = u.id
            WHERE NOT r.secret AND r.score IS NOT NULL AND r.passed
        ),

        -- Select only the best run for each user and GPU type.
        personal_best_runs AS (
            SELECT * FROM personal_best_candidates WHERE personal_submission_rank = 1
        ),

        -- Order the personal best runs by score for each leaderboard and GPU type.
        competitive_rankings AS (
            SELECT leaderboard_id, runner, user_name, score,
            RANK() OVER (PARTITION BY leaderboard_id, runner ORDER BY score ASC) AS user_rank
            FROM personal_best_runs)

        -- Build the JSON response.
        SELECT jsonb_build_object(
            'id', l.id,
            'name', l.name,
            'deadline', l.deadline,
            'gpu_types', (SELECT jsonb_agg(gpu_type) FROM gpu_types g WHERE g.leaderboard_id = l.id),
            'priority_gpu_type', (SELECT g.gpu_type FROM priority_gpu_types g WHERE g.leaderboard_id = l.id),
            'top_users',

                -- For the priority GPU type, get the top 3 users by rank.
                (SELECT jsonb_agg(
                    jsonb_build_object(
                        'rank', r.user_rank,
                        'score', r.score,
                        'user_name', r.user_name
                    )
                    ORDER BY r.user_rank ASC
                  )
                  FROM competitive_rankings r
                  WHERE r.leaderboard_id = l.id AND r.user_rank <= 3
                )
        )
        FROM active_leaderboards l
        ORDER BY l.id DESC;
        """
    return query
