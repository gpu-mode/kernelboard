import re
from typing import Any, List
from flask import Blueprint
from kernelboard.lib.db import get_db_connection
from kernelboard.lib.time import to_time_left
from kernelboard.lib.status_code import http_error, http_success
from http import HTTPStatus
import time
import logging

logger = logging.getLogger(__name__)

leaderboard_bp = Blueprint(
    "leaderboard_bp", __name__, url_prefix="/leaderboard"
)


@leaderboard_bp.route("/<int:leaderboard_id>", methods=["GET"])
def leaderboard(leaderboard_id: int):
    total_start = time.perf_counter()

    # 1. Database connection
    db_conn_start = time.perf_counter()
    conn = get_db_connection()
    db_conn_time = (time.perf_counter() - db_conn_start) * 1000

    # 2. Query execution
    query = _get_query()
    query_start = time.perf_counter()
    with conn.cursor() as cur:
        cur.execute(query, {"leaderboard_id": leaderboard_id})
        result = cur.fetchone()
    query_time = (time.perf_counter() - query_start) * 1000

    if is_result_invalid(result):
        return http_error(
            f"canonot find leaderboard with id {leaderboard_id}",
            10000 + HTTPStatus.NOT_FOUND,
            HTTPStatus.NOT_FOUND,
        )

    data = result[0]

    # 3. Data transformation
    transform_start = time.perf_counter()
    res = to_api_leaderboard_item(data)
    transform_time = (time.perf_counter() - transform_start) * 1000

    total_time = (time.perf_counter() - total_start) * 1000

    # Log timing breakdown
    logger.info(
        "[Perf] leaderboard_id=%s | "
        "db_conn=%.2fms | query=%.2fms | transform=%.2fms | total=%.2fms",
        leaderboard_id,
        db_conn_time,
        query_time,
        transform_time,
        total_time,
    )

    return http_success(res)


# converts db record to api
def to_api_leaderboard_item(data: dict[str, Any]):
    leaderboard_data = data["leaderboard"]
    name = leaderboard_data["name"]
    deadline = leaderboard_data["deadline"]
    time_left = to_time_left(deadline)

    lang = leaderboard_data["lang"]
    if lang == "py":
        lang = "Python"

    description = leaderboard_data["description"] or ""
    description = description.replace("\\n", "\n")

    reference = leaderboard_data["reference"] or ""
    reference = reference.replace("\\n", "\n")

    gpu_types = leaderboard_data["gpu_types"]
    gpu_types.sort()

    rankings = {}
    for gpu_type, ranking_ in data["rankings"].items():
        ranking = []
        prev_score = None

        if ranking_ is not None:
            for i, entry in enumerate(ranking_):
                entry["rank"] = i + 1

                if prev_score is not None:
                    entry["prev_score"] = entry["score"] - prev_score
                else:
                    entry["prev_score"] = None

                ranking.append(entry)

                prev_score = entry["score"]

        if len(ranking) > 0:
            rankings[gpu_type] = ranking
    return {
        "name": name,
        "deadline": deadline,
        "time_left": time_left,
        "lang": lang,
        "gpu_types": gpu_types,
        "description": description,
        "reference": reference,
        "rankings": rankings,
    }


def _get_query():
    query = """
        WITH

        -- Basic info about the leaderboard.
        leaderboard_info AS (
            SELECT
                name,
                deadline,
                task->>'lang' AS lang,
                description AS description,
                task->'files'->>'reference.py' AS reference
            FROM leaderboard.leaderboard
            WHERE id = %(leaderboard_id)s
        ),

        -- All the different GPU types for this leaderboard.
        gpu_types AS (
            SELECT DISTINCT gpu_type
            FROM leaderboard.gpu_type
            WHERE leaderboard_id = %(leaderboard_id)s
        ),

        -- All the runs on this leaderboard. For each user and GPU type, the
        -- user's runs on that GPU type are ranked by score.
        ranked_runs AS (
            SELECT r.runner AS runner,
                u.user_name AS user_name,
                r.score AS score,
                s.submission_time AS submission_time,
                s.file_name AS file_name,
                r.submission_id AS submission_id,
                RANK() OVER (PARTITION BY r.runner, u.id ORDER BY r.score ASC) AS rank
            FROM leaderboard.runs r
                JOIN leaderboard.submission s ON r.submission_id = s.id
                LEFT JOIN leaderboard.user_info u ON s.user_id = u.id
            WHERE NOT r.secret AND r.score IS NOT NULL AND r.passed AND s.leaderboard_id = %(leaderboard_id)s
        ),

        -- From ranked_runs, keep only the top run per user.
        top_runs AS (SELECT * FROM ranked_runs WHERE rank = 1)

        SELECT jsonb_build_object(
            'rankings', (SELECT jsonb_object_agg(g.gpu_type, (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'user_name', r.user_name,
                        'score', r.score,
                        'file_name', r.file_name,
                        'submission_id', r.submission_id
                    )
                    ORDER BY r.score ASC
                )
                FROM top_runs r WHERE r.runner = g.gpu_type))),

            'leaderboard', (SELECT jsonb_build_object(
                'name', name,
                'deadline', deadline,
                'lang', lang,
                'description', description,
                'reference', reference,
                'gpu_types', (SELECT jsonb_agg(gpu_type) FROM gpu_types)
            ) FROM leaderboard_info)
        ) AS result FROM (SELECT gpu_type FROM gpu_types) g;
    """
    return query


def is_result_invalid(result):
    if result is None:
        return True
    if len(result) == 0:
        return True
    if not result[0] or not result[0]["leaderboard"]:
        return True

    return False


# ai generated code hardcoded user_id
HARDCODED_USER_ID = "205851652572315658"


@leaderboard_bp.route("/<int:leaderboard_id>/ai_trend", methods=["GET"])
def get_ai_trend(leaderboard_id: int):
    """
    GET /leaderboard/<leaderboard_id>/ai_trend

    Returns time series data for ai_trend matching file name patterns like:
    - H100_claude-opus-4.5_ka_submission
    - H100_gpt-5-2_ka_submission
    - H100_gpt-5_ka_submission
    """
    total_start = time.perf_counter()

    conn = get_db_connection()
    query_start = time.perf_counter()

    with conn.cursor() as cur:
        sql = """
            SELECT
                s.id AS submission_id,
                s.file_name,
                s.submission_time,
                r.score,
                r.passed,
                r.runner AS gpu_type,
                r.mode
            FROM leaderboard.submission s
            JOIN leaderboard.runs r ON r.submission_id = s.id
            WHERE s.user_id = %s
              AND s.leaderboard_id = %s
              AND r.score IS NOT NULL
              AND r.passed = true
              AND NOT r.secret
            ORDER BY s.submission_time ASC
        """
        cur.execute(sql, (HARDCODED_USER_ID, leaderboard_id))
        rows = cur.fetchall()

    query_time = (time.perf_counter() - query_start) * 1000

    if not rows:
        return http_success(data={
            "leaderboard_id": leaderboard_id,
            "time_series": {},
        })

    items = []
    for row in rows:
        (submission_id, file_name, submission_time,
         score, passed, gpu_type, mode) = row
        model_name = parse_model_from_filename(file_name)

        # Skip files that don't match the ka_submission.py pattern
        if model_name is None:
            continue

        items.append({
            "submission_id": submission_id,
            "file_name": file_name,
            "submission_time": (
                submission_time.isoformat() if submission_time else None
            ),
            "score": score,
            "passed": passed,
            "gpu_type": gpu_type,
            "mode": mode,
            "model": model_name,
        })

    series_by_model = group_by_model(items)

    total_time = (time.perf_counter() - total_start) * 1000
    logger.info(
        "[Perf] timeseries leaderboard_id=%s | query=%.2fms | total=%.2fms",
        leaderboard_id, query_time, total_time,
    )

    return http_success(data={
        "leaderboard_id": leaderboard_id,
        "time_series": series_by_model,
    })


def parse_model_from_filename(file_name: str) -> str:
    """
    Extract model name - the segment right before _ka_submission.py
    Examples:
    - matmul_py_H100_claude-opus-4.5_ka_submission.py -> claude-opus-4.5
    - trimul_H100_gpt-52_ka_submission.py -> gpt-52
    Returns None if file doesn't match pattern.
    """
    suffix = "_ka_submission.py"
    if not file_name or not file_name.endswith(suffix):
        return None

    # Remove the suffix and get everything before it
    base = file_name[:-len(suffix)]
    # Split by underscore and get the last segment
    parts = base.rsplit("_", 1)
    if len(parts) == 2:
        return parts[1]

    return None


def group_by_model(items: List[dict]) -> dict:
    """
    Group time series items by gpu_type first, then by model name.
    Skips items where model or gpu_type is unknown.
    Returns: { "H100": { "claude-opus-4.5": [...], "gpt-5": [...] } }
    """
    series = {}
    for item in items:
        gpu_type = item.get("gpu_type")
        model = item.get("model")

        # Skip if model or gpu_type is unknown or missing
        if not gpu_type or gpu_type == "unknown":
            continue
        if not model or model == "unknown":
            continue

        if gpu_type not in series:
            series[gpu_type] = {}

        if model not in series[gpu_type]:
            series[gpu_type][model] = []

        series[gpu_type][model].append({
            "submission_time": item["submission_time"],
            "score": item["score"],
            "submission_id": item["submission_id"],
        })
    return series
