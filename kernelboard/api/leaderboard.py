import logging
import time
from http import HTTPStatus
from typing import List

from flask import Blueprint

from kernelboard.lib.db import get_db_connection
from kernelboard.lib.kernelbot_client import get_leaderboard_rankings, to_leaderboard_view
from kernelboard.lib.status_code import http_error, http_success

logger = logging.getLogger(__name__)

leaderboard_bp = Blueprint(
    "leaderboard_bp", __name__, url_prefix="/leaderboard"
)


@leaderboard_bp.route("/<int:leaderboard_id>", methods=["GET"])
def leaderboard(leaderboard_id: int):
    total_start = time.perf_counter()

    kernelbot_start = time.perf_counter()
    data, status_code = get_leaderboard_rankings(leaderboard_id)
    kernelbot_time = (time.perf_counter() - kernelbot_start) * 1000

    if status_code == HTTPStatus.NOT_FOUND:
        return http_error(
            f"cannot find leaderboard with id {leaderboard_id}",
            10000 + HTTPStatus.NOT_FOUND,
            HTTPStatus.NOT_FOUND,
        )

    if status_code != HTTPStatus.OK:
        return http_error(
            "could not fetch leaderboard rankings",
            10000 + HTTPStatus.BAD_GATEWAY,
            HTTPStatus.BAD_GATEWAY,
        )

    transform_start = time.perf_counter()
    res = to_leaderboard_view(data)
    transform_time = (time.perf_counter() - transform_start) * 1000

    total_time = (time.perf_counter() - total_start) * 1000

    # Log timing breakdown
    logger.info(
        "[Perf] leaderboard_id=%s | "
        "kernelbot=%.2fms | transform=%.2fms | total=%.2fms",
        leaderboard_id,
        kernelbot_time,
        transform_time,
        total_time,
    )

    return http_success(res)


# ai generated code hardcoded user_id
HARDCODED_USER_ID = "261278773"


@leaderboard_bp.route("/<int:leaderboard_id>/custom_trend", methods=["GET"])
def get_custom_trend(leaderboard_id: int):
    """
    GET /leaderboard/<leaderboard_id>/custom_trend

    Returns time series data for custom submissions matching file name patterns like:
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
              AND NOT EXISTS (
                  SELECT 1
                  FROM leaderboard.runs sr
                  WHERE sr.submission_id = s.id
                    AND sr.secret
                    AND sr.runner = r.runner
                    AND sr.passed = FALSE
              )
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
        "[Perf] custom_trend leaderboard_id=%s | query=%.2fms | total=%.2fms",
        leaderboard_id, query_time, total_time,
    )

    return http_success(data={
        "leaderboard_id": leaderboard_id,
        "time_series": series_by_model,
    })


@leaderboard_bp.route("/<int:leaderboard_id>/user_trend", methods=["GET"])
def get_user_trend(leaderboard_id: int):
    """
    GET /leaderboard/<leaderboard_id>/user_trend?user_id=...

    Query parameters:
    - user_id: User ID(s), comma-separated for multiple (required)

    Examples:
    - ?user_id=123
    - ?user_id=123,456,789

    Returns time series data for all submissions from the specified users.
    """
    from flask import request

    total_start = time.perf_counter()

    user_id_param = request.args.get("user_id", "")
    user_ids = [uid.strip() for uid in user_id_param.split(",") if uid.strip()]

    if not user_ids:
        return http_error(
            "user_id is required",
            10000 + HTTPStatus.BAD_REQUEST,
            HTTPStatus.BAD_REQUEST,
        )

    conn = get_db_connection()
    user_map = {}  # user_id -> display_name

    with conn.cursor() as cur:
        # Fetch display names for all user_ids in batch
        placeholders = ",".join(["%s"] * len(user_ids))
        cur.execute(
            f"SELECT id, user_name FROM leaderboard.user_info "
            f"WHERE id IN ({placeholders})",
            tuple(user_ids)
        )
        for row in cur.fetchall():
            user_map[str(row[0])] = row[1] if row[1] else str(row[0])

        # Log warning for any user_ids not found in database
        for uid in user_ids:
            if uid not in user_map:
                logger.warning("User ID not found in database: %s", uid)
                user_map[uid] = uid

        query_start = time.perf_counter()

        # Query for all users at once
        user_id_list = list(user_map.keys())
        placeholders = ",".join(["%s"] * len(user_id_list))

        sql = f"""
            SELECT
                s.id AS submission_id,
                s.user_id,
                s.file_name,
                s.submission_time,
                r.score,
                r.passed,
                r.runner AS gpu_type,
                r.mode
            FROM leaderboard.submission s
            JOIN leaderboard.runs r ON r.submission_id = s.id
            WHERE s.user_id IN ({placeholders})
              AND s.leaderboard_id = %s
              AND r.score IS NOT NULL
              AND r.passed = true
              AND NOT r.secret
              AND NOT EXISTS (
                  SELECT 1
                  FROM leaderboard.runs sr
                  WHERE sr.submission_id = s.id
                    AND sr.secret
                    AND sr.runner = r.runner
                    AND sr.passed = FALSE
              )
            ORDER BY s.submission_time ASC
        """
        cur.execute(sql, (*user_id_list, leaderboard_id))
        rows = cur.fetchall()

    query_time = (time.perf_counter() - query_start) * 1000

    if not rows:
        return http_success(data={
            "leaderboard_id": leaderboard_id,
            "user_ids": user_id_list,
            "time_series": {},
        })

    # Group items by user_id first
    items_by_user = {}
    for row in rows:
        (submission_id, user_id, file_name, submission_time,
         score, passed, gpu_type, mode) = row
        user_id_str = str(user_id)

        if user_id_str not in items_by_user:
            items_by_user[user_id_str] = []

        items_by_user[user_id_str].append({
            "submission_id": submission_id,
            "user_id": user_id_str,
            "user_name": user_map.get(user_id_str, user_id_str),
            "file_name": file_name,
            "submission_time": (
                submission_time.isoformat() if submission_time else None
            ),
            "score": score,
            "passed": passed,
            "gpu_type": gpu_type,
            "mode": mode,
        })

    # Group by gpu_type with username as series name
    series_by_gpu = group_multi_user_submissions(items_by_user, user_map)

    total_time = (time.perf_counter() - total_start) * 1000
    logger.info(
        "[Perf] user_trend leaderboard_id=%s users=%s | "
        "query=%.2fms | total=%.2fms",
        leaderboard_id, list(user_map.values()), query_time, total_time,
    )

    return http_success(data={
        "leaderboard_id": leaderboard_id,
        "user_ids": user_id_list,
        "time_series": series_by_gpu,
    })


@leaderboard_bp.route("/<int:leaderboard_id>/fastest_trend", methods=["GET"])
def get_fastest_trend(leaderboard_id: int):
    """
    GET /leaderboard/<leaderboard_id>/fastest_trend

    Returns time series data showing the fastest submission across ALL users
    over time for each GPU type. This creates a "world record" line showing
    the best performance achieved at any point in time.
    """
    total_start = time.perf_counter()

    conn = get_db_connection()
    query_start = time.perf_counter()

    with conn.cursor() as cur:
        sql = """
            SELECT
                s.id AS submission_id,
                s.user_id,
                u.user_name,
                s.file_name,
                s.submission_time,
                r.score,
                r.runner AS gpu_type
            FROM leaderboard.submission s
            JOIN leaderboard.runs r ON r.submission_id = s.id
            LEFT JOIN leaderboard.user_info u ON s.user_id = u.id
            WHERE s.leaderboard_id = %s
              AND r.score IS NOT NULL
              AND r.passed = true
              AND NOT r.secret
              AND NOT EXISTS (
                  SELECT 1
                  FROM leaderboard.runs sr
                  WHERE sr.submission_id = s.id
                    AND sr.secret
                    AND sr.runner = r.runner
                    AND sr.passed = FALSE
              )
            ORDER BY s.submission_time ASC
        """
        cur.execute(sql, (leaderboard_id,))
        rows = cur.fetchall()

    query_time = (time.perf_counter() - query_start) * 1000

    if not rows:
        return http_success(data={
            "leaderboard_id": leaderboard_id,
            "time_series": {},
        })

    # Group by GPU type and compute running minimum
    series_by_gpu = {}
    running_min_by_gpu = {}

    for row in rows:
        (submission_id, user_id, user_name, file_name, submission_time,
         score, gpu_type) = row

        if not gpu_type or gpu_type == "unknown":
            continue

        if gpu_type not in series_by_gpu:
            series_by_gpu[gpu_type] = {"fastest": []}
            running_min_by_gpu[gpu_type] = float("inf")

        # Only add a point if this submission beats the current record
        if score < running_min_by_gpu[gpu_type]:
            running_min_by_gpu[gpu_type] = score
            series_by_gpu[gpu_type]["fastest"].append({
                "submission_time": (
                    submission_time.isoformat() if submission_time else None
                ),
                "score": score,
                "user_id": str(user_id) if user_id else None,
                "user_name": user_name or str(user_id) if user_id else "Unknown",
                "gpu_type": gpu_type,
                "submission_id": submission_id,
            })

    total_time = (time.perf_counter() - total_start) * 1000
    logger.info(
        "[Perf] fastest_trend leaderboard_id=%s | query=%.2fms | total=%.2fms",
        leaderboard_id, query_time, total_time,
    )

    return http_success(data={
        "leaderboard_id": leaderboard_id,
        "time_series": series_by_gpu,
    })


@leaderboard_bp.route("/<int:leaderboard_id>/users", methods=["GET"])
def search_users(leaderboard_id: int):
    """
    GET /leaderboard/<leaderboard_id>/users?q=...
    Search for users who have submissions on this leaderboard.

    Query parameters:
    - q: Search query for username (partial match, case-insensitive)
    - limit: Maximum number of results to return (default 20)

    Returns list of users with their user_id and username.
    """
    from flask import request

    query = request.args.get("q", "").strip()
    limit = min(int(request.args.get("limit", 20)), 100)

    conn = get_db_connection()

    with conn.cursor() as cur:
        if query:
            sql = """
                SELECT DISTINCT u.id, u.user_name
                FROM leaderboard.user_info u
                JOIN leaderboard.submission s ON s.user_id = u.id
                WHERE s.leaderboard_id = %s
                  AND u.user_name ILIKE %s
                ORDER BY u.user_name
                LIMIT %s
            """
            cur.execute(sql, (leaderboard_id, f"%{query}%", limit))
        else:
            sql = """
                SELECT DISTINCT u.id, u.user_name
                FROM leaderboard.user_info u
                JOIN leaderboard.submission s ON s.user_id = u.id
                WHERE s.leaderboard_id = %s
                ORDER BY u.user_name
                LIMIT %s
            """
            cur.execute(sql, (leaderboard_id, limit))

        rows = cur.fetchall()

    users = [
        {"user_id": str(row[0]), "username": row[1] or str(row[0])}
        for row in rows
    ]

    return http_success(data={
        "leaderboard_id": leaderboard_id,
        "users": users,
    })


def group_multi_user_submissions(
    items_by_user: dict,
    user_map: dict
) -> dict:
    """
    Group submissions from multiple users by gpu_type with username as series.
    Same format as custom_trend: { "H100": { "user1": [...], "user2": [...] } }
    """
    series = {}
    for user_id, items in items_by_user.items():
        display_name = user_map.get(user_id, user_id)

        for item in items:
            gpu_type = item.get("gpu_type")

            if not gpu_type or gpu_type == "unknown":
                continue

            if gpu_type not in series:
                series[gpu_type] = {}

            if user_id not in series[gpu_type]:
                series[gpu_type][user_id] = []

            series[gpu_type][user_id].append({
                "submission_time": item["submission_time"],
                "score": item["score"],
                "user_id": user_id,
                "user_name": display_name,
                "gpu_type": gpu_type,
                "submission_id": item["submission_id"],
            })
    return series


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
            "gpu_type": gpu_type,
            "submission_id": item["submission_id"],
        })
    return series
