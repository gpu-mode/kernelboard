import logging
import time
from datetime import datetime, timezone

from flask import Blueprint, request

from kernelboard.lib.db import get_db_connection
from kernelboard.lib.status_code import http_success

logger = logging.getLogger(__name__)

leaderboard_summaries_bp = Blueprint(
    "leaderboard_summaries_bp", __name__, url_prefix="/leaderboard-summaries"
)


@leaderboard_summaries_bp.route("", methods=["GET"])
def index():
    total_start = time.perf_counter()

    # Check if legacy v1 query is requested (v2 is now default)
    use_v1 = request.args.get("v1_query") is not None

    # 1. Database connection
    db_conn_start = time.perf_counter()
    conn = get_db_connection()
    db_conn_time = (time.perf_counter() - db_conn_start) * 1000

    # 2. Query execution (v2 is default, v1 for legacy)
    query = _get_query_v1() if use_v1 else _get_query()
    query_start = time.perf_counter()
    with conn.cursor() as cur:
        cur.execute(query)
        leaderboards = [row[0] for row in cur.fetchall()]
    query_time = (time.perf_counter() - query_start) * 1000

    # 3. Data transformation
    transform_start = time.perf_counter()
    for lb in leaderboards:
        if lb["gpu_types"] is None:
            lb["gpu_types"] = []
    transform_time = (time.perf_counter() - transform_start) * 1000

    total_time = (time.perf_counter() - total_start) * 1000

    # Log timing breakdown
    version = "v1" if use_v1 else "v2"
    logger.info(
        "[Perf] leaderboard_summaries (%s) | "
        "db_conn=%.2fms | query=%.2fms | transform=%.2fms | total=%.2fms",
        version,
        db_conn_time,
        query_time,
        transform_time,
        total_time,
    )

    return http_success(
        {"leaderboards": leaderboards, "now": datetime.now(timezone.utc)}
    )


def _get_query():
    """
    Optimized query for leaderboard summaries (default).

    Performance optimizations:
    1. Use DISTINCT ON instead of ROW_NUMBER for priority GPU selection
    2. Pre-aggregate GPU types to avoid correlated subqueries
    3. Pre-aggregate top users JSON to avoid correlated subqueries
    """
    query = """
        WITH
        -- Pre-aggregate GPU types per leaderboard (avoids correlated subquery)
        gpu_types_agg AS (
            SELECT
                leaderboard_id,
                jsonb_agg(DISTINCT gpu_type) AS gpu_types
            FROM leaderboard.gpu_type
            GROUP BY leaderboard_id
        ),

        -- Get priority GPU type using DISTINCT ON (faster than ROW_NUMBER)
        priority_gpu AS (
            SELECT DISTINCT ON (leaderboard_id)
                leaderboard_id,
                gpu_type
            FROM leaderboard.gpu_type
            ORDER BY leaderboard_id,
                CASE gpu_type
                    WHEN 'B200' THEN 1
                    WHEN 'H100' THEN 2
                    WHEN 'MI300' THEN 3
                    WHEN 'A100' THEN 4
                    WHEN 'L4'   THEN 5
                    WHEN 'T4'   THEN 6
                    ELSE 7
                END,
                gpu_type
        ),

        -- Step 1: Get each user's best run per leaderboard+runner (same as v1)
        personal_best_candidates AS (
            SELECT
                r.runner,
                s.leaderboard_id,
                s.user_id,
                u.user_name,
                r.score,
                RANK() OVER (
                    PARTITION BY s.leaderboard_id, r.runner, s.user_id
                    ORDER BY r.score ASC
                ) AS personal_submission_rank
            FROM leaderboard.runs r
            JOIN leaderboard.submission s ON r.submission_id = s.id
            JOIN priority_gpu p ON p.leaderboard_id = s.leaderboard_id
                AND p.gpu_type = r.runner
            LEFT JOIN leaderboard.user_info u ON s.user_id = u.id
            WHERE NOT r.secret
                AND r.score IS NOT NULL
                AND r.passed
        ),

        -- Step 2: Select only the best run for each user
        personal_best_runs AS (
            SELECT * FROM personal_best_candidates
            WHERE personal_submission_rank = 1
        ),

        -- Step 3: Rank users by score (same as v1)
        ranked_users AS (
            SELECT
                leaderboard_id,
                runner,
                user_name,
                score,
                RANK() OVER (
                    PARTITION BY leaderboard_id, runner
                    ORDER BY score ASC
                ) AS user_rank
            FROM personal_best_runs
        ),

        -- Pre-aggregate top 3 users JSON (optimization over v1)
        top_users_agg AS (
            SELECT
                leaderboard_id,
                jsonb_agg(
                    jsonb_build_object(
                        'rank', user_rank,
                        'score', score,
                        'user_name', user_name
                    )
                    ORDER BY user_rank
                ) AS top_users
            FROM ranked_users
            WHERE user_rank <= 3
            GROUP BY leaderboard_id
        )

        -- Final SELECT with pre-aggregated data (no correlated subqueries)
        SELECT jsonb_build_object(
            'id', l.id,
            'name', l.name,
            'deadline', l.deadline,
            'gpu_types', COALESCE(g.gpu_types, '[]'::jsonb),
            'priority_gpu_type', p.gpu_type,
            'top_users', t.top_users
        )
        FROM leaderboard.leaderboard l
        LEFT JOIN gpu_types_agg g ON g.leaderboard_id = l.id
        LEFT JOIN priority_gpu p ON p.leaderboard_id = l.id
        LEFT JOIN top_users_agg t ON t.leaderboard_id = l.id
        ORDER BY l.id DESC;
        """
    return query


def _get_query_v1():
    """Legacy query (use ?v1 to enable)."""
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
