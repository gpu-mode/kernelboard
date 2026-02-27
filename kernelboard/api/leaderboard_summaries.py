import json
import logging
import os
import time
from datetime import datetime, timezone

from flask import Blueprint, request

from kernelboard.lib.auth_utils import get_id_and_username_from_session, get_whitelist
from kernelboard.lib.db import get_db_connection
from kernelboard.lib.redis_connection import get_redis_connection
from kernelboard.lib.status_code import http_success

logger = logging.getLogger(__name__)

leaderboard_summaries_bp = Blueprint("leaderboard_summaries_bp", __name__, url_prefix="/leaderboard-summaries")

# Redis cache key prefix for ended leaderboard top_users
CACHE_KEY_PREFIX = "lb_top_users:"


# =============================================================================
# Redis Cache Helpers
# =============================================================================


def _get_redis():
    """Get Redis connection (singleton)."""
    cert_reqs = os.getenv("REDIS_SSL_CERT_REQS")
    return get_redis_connection(cert_reqs=cert_reqs)


def _get_cached_top_users(redis_conn, leaderboard_ids: list[int]) -> dict[int, list]:
    """Get cached top_users for multiple leaderboards from Redis."""
    if not redis_conn or not leaderboard_ids:
        return {}

    keys = [f"{CACHE_KEY_PREFIX}{lb_id}" for lb_id in leaderboard_ids]
    try:
        values = redis_conn.mget(keys)
        result = {}
        for lb_id, value in zip(leaderboard_ids, values):
            if value:
                result[lb_id] = json.loads(value)
        return result
    except Exception:
        logger.warning("Redis cache read failed", exc_info=True)
        return {}


def _set_cached_top_users(redis_conn, leaderboard_id: int, top_users: list):
    """Cache top_users for ended leaderboard (no expiry)."""
    if not redis_conn:
        return

    try:
        key = f"{CACHE_KEY_PREFIX}{leaderboard_id}"
        redis_conn.set(key, json.dumps(top_users))
    except Exception:
        logger.warning("Redis cache write failed", exc_info=True)


def _delete_cached_top_users(redis_conn, leaderboard_ids: list[int]):
    """Delete cached top_users for leaderboards (e.g., when deadline extended)."""
    if not redis_conn or not leaderboard_ids:
        return
    try:
        keys = [f"{CACHE_KEY_PREFIX}{lb_id}" for lb_id in leaderboard_ids]
        redis_conn.delete(*keys)
    except Exception:
        logger.warning("Redis cache delete failed", exc_info=True)


# =============================================================================
# Main API Endpoint
# =============================================================================


@leaderboard_summaries_bp.route("", methods=["GET"])
def index():
    """
    Get leaderboard summaries.

    Query params:
        - use_beta: Use hide beta query
        - force_refresh_cache: Clear and refresh cache for ended leaderboards
    """
    total_start = time.perf_counter()

    use_beta = request.args.get("use_beta") is not None
    force_refresh = request.args.get("force_refresh_cache") is not None

    # Check if user is admin to force refresh cache
    user_id, _ = get_id_and_username_from_session()
    whitelist = get_whitelist()
    if not user_id or user_id not in whitelist:
        logger.info("[leaderboard_summaries] skip force_refresh since user is not admin")
        force_refresh = False

    # Choose strategy based on query params
    if use_beta:
        return _get_leaderboards_cached(total_start, force_refresh)
    else:
        return _get_leaderboards_original(total_start)


# =============================================================================
# Strategy 1: Cached (default) - Cache ended leaderboards in Redis
# =============================================================================


def _get_leaderboards_cached(total_start: float, force_refresh: bool = False):
    """
    Get leaderboard summaries with Redis caching for ended leaderboards.

    Args:
        total_start: Start time for performance logging
        force_refresh: If True, ignore cache and recompute all ended leaderboards

    Strategy:
    - Ended leaderboards (deadline < NOW): Read from Redis cache
    - Active leaderboards (deadline >= NOW): Compute in real-time
    - Uncached ended leaderboards: Compute and store in cache
    """
    # 1. Database & Redis connection
    db_conn_start = time.perf_counter()
    conn = get_db_connection()
    redis_conn = _get_redis()
    db_conn_time = (time.perf_counter() - db_conn_start) * 1000

    query_start = time.perf_counter()

    with conn.cursor() as cur:
        # 2. Get all leaderboards and identify ended vs active
        cur.execute("""
            SELECT id, name, deadline,
                   deadline < NOW() AS is_ended
            FROM leaderboard.leaderboard
            ORDER BY id DESC
        """)
        all_leaderboards = cur.fetchall()

        ended_ids = [row[0] for row in all_leaderboards if row[3]]
        active_ids = [row[0] for row in all_leaderboards if not row[3]]

        # 3. Delete stale cache for active leaderboards (ex. deadline extended)
        if active_ids:
            _delete_cached_top_users(redis_conn, active_ids)

        # 4. Try to get cached top_users for ended leaderboards
        cache_start = time.perf_counter()
        if force_refresh:
            logger.info("[Cache] force_refresh=True, ignoring cache")
            cached_top_users = {}
        else:
            cached_top_users = _get_cached_top_users(redis_conn, ended_ids)
        cache_time = (time.perf_counter() - cache_start) * 1000

        # Find ended leaderboards not in cache
        uncached_ended_ids = [lb_id for lb_id in ended_ids if lb_id not in cached_top_users]
        logger.info(
            "[Cache] cached=%d | uncached=%d | active=%d",
            len(cached_top_users),
            len(uncached_ended_ids),
            len(active_ids),
        )

        # 4. Compute top_users for: active + uncached ended leaderboards
        ids_to_compute = active_ids + uncached_ended_ids

        compute_start = time.perf_counter()
        if ids_to_compute:
            ids_tuple = tuple(ids_to_compute)
            cur.execute(_get_query_for_ids(), (ids_tuple, ids_tuple))
            computed_results = {row[0]: row[1] for row in cur.fetchall()}
        else:
            computed_results = {}
        compute_time = (time.perf_counter() - compute_start) * 1000

        # 5. Cache newly computed ended leaderboards
        for lb_id in uncached_ended_ids:
            if lb_id in computed_results:
                _set_cached_top_users(redis_conn, lb_id, computed_results[lb_id])

        # 6. Get metadata for all leaderboards
        cur.execute(_get_leaderboard_metadata_query())
        metadata = {row[0]: row[1] for row in cur.fetchall()}

    # 7. Build final response
    leaderboards = []
    for row in all_leaderboards:
        lb_id = row[0]
        lb_data = metadata.get(lb_id, {})

        # Get top_users from cache or computed results
        lb_data["top_users"] = cached_top_users.get(lb_id, computed_results.get(lb_id))

        if lb_data.get("gpu_types") is None:
            lb_data["gpu_types"] = []
        leaderboards.append(lb_data)

    query_time = (time.perf_counter() - query_start) * 1000
    total_time = (time.perf_counter() - total_start) * 1000

    logger.info(
        "[Perf] leaderboard_summaries (cached) | "
        "db_conn=%.2fms | cache=%.2fms | compute=%.2fms | "
        "total_query=%.2fms | total=%.2fms | "
        "cached=%d | computed=%d",
        db_conn_time,
        cache_time,
        compute_time,
        query_time,
        total_time,
        len(cached_top_users),
        len(computed_results),
    )

    return http_success(
        {
            "leaderboards": leaderboards,
            "now": datetime.now(timezone.utc),
        }
    )


# =============================================================================
# Strategy 2: Original - No caching, compute all in one query
# =============================================================================


def _get_leaderboards_original(total_start: float):
    """
    Get leaderboard summaries without caching (original implementation).
    """
    # 1. Database connection
    db_conn_start = time.perf_counter()
    conn = get_db_connection()
    db_conn_time = (time.perf_counter() - db_conn_start) * 1000

    # 2. Query execution
    query = _get_query()
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
    transform_time: float = (time.perf_counter() - transform_start) * 1000

    total_time = (time.perf_counter() - total_start) * 1000

    logger.info(
        "[Perf] leaderboard_summaries (original) | db_conn=%.2fms | query=%.2fms | transform=%.2fms | total=%.2fms",
        db_conn_time,
        query_time,
        transform_time,
        total_time,
    )

    return http_success(
        {
            "leaderboards": leaderboards,
            "now": datetime.now(timezone.utc),
        }
    )


# =============================================================================
# SQL Query Builders
# =============================================================================


def _get_leaderboard_metadata_query():
    """Get leaderboard metadata (id, name, deadline, gpu_types)."""
    return """
        WITH
        gpu_types_agg AS (
            SELECT
                leaderboard_id,
                jsonb_agg(DISTINCT gpu_type) AS gpu_types
            FROM leaderboard.gpu_type
            GROUP BY leaderboard_id
        ),
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
        )
        SELECT
            l.id,
            jsonb_build_object(
                'id', l.id,
                'name', l.name,
                'deadline', l.deadline,
                'gpu_types', COALESCE(g.gpu_types, '[]'::jsonb),
                'priority_gpu_type', p.gpu_type
            )
        FROM leaderboard.leaderboard l
        LEFT JOIN gpu_types_agg g ON g.leaderboard_id = l.id
        LEFT JOIN priority_gpu p ON p.leaderboard_id = l.id
        ORDER BY l.id DESC;
    """


def _get_query_for_ids():
    """
    Get top_users for specific leaderboard IDs only.
    Returns (leaderboard_id, top_users_json) pairs.

    Usage: cur.execute(_get_query_for_ids(), (tuple(leaderboard_ids),) * 2)
    """
    return """
        WITH
        priority_gpu AS (
            SELECT DISTINCT ON (leaderboard_id)
                leaderboard_id,
                gpu_type
            FROM leaderboard.gpu_type
            WHERE leaderboard_id IN %s
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
                AND s.leaderboard_id IN %s
        ),
        personal_best_runs AS (
            SELECT * FROM personal_best_candidates
            WHERE personal_submission_rank = 1
        ),
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
        SELECT leaderboard_id, top_users
        FROM top_users_agg;
    """


def _get_query():
    """
    Optimized query for leaderboard summaries (v2).

    Performance optimizations:
    1. Use DISTINCT ON instead of ROW_NUMBER for priority GPU selection
    2. Pre-aggregate GPU types to avoid correlated subqueries
    3. Pre-aggregate top users JSON to avoid correlated subqueries
    """
    return """
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

        -- Step 1: Get each user's best run per leaderboard+runner
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

        -- Step 3: Rank users by score
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

        -- Pre-aggregate top 3 users JSON
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
