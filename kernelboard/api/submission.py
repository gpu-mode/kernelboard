import http
from typing import Any, List, Optional, Tuple
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import requests
from kernelboard.lib.auth_utils import (
    get_id_and_username_from_session,
)
from kernelboard.lib.db import get_db_connection
from kernelboard.lib.error import ValidationError, validate_required_fields
from kernelboard.lib.file_handler import get_submission_file_info
from kernelboard.lib.status_code import http_error, http_success
import logging
import os
from kernelboard.lib.rate_limiter import limiter
import time

logger = logging.getLogger(__name__)

submission_bp = Blueprint("submission_bp", __name__)

REQUIRED_SUBMISSION_REQUEST_FIELDS = [
    "leaderboard_id",
    "leaderboard",
    "gpu_type",
    "submission_mode",
]


# official one: https://discord-cluster-manager-1f6c4782e60a.herokuapp.com/submission
WEB_AUTH_HEADER = "X-Web-Auth-Id"
MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1MB max file size

@submission_bp.route("/submission", methods=["POST"])
@login_required
@limiter.limit(
    "60 per minute",
    exempt_when=lambda: not current_user.is_authenticated #ignore unauthenticated, since they won't hit the api
)

def submission():
    # make sure user is logged in
    logger.info("submission received")
    user_id, username = get_id_and_username_from_session()
    log_rate_limit()

    web_token = get_user_token(user_id)
    if not web_token:
        logger.error("user %s missing web token", user_id)
        return http_error(
            message="cannot find user info from db for user. if this is a bug, please contact the gpumode administrator",
            status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
        )
    req = request.form.to_dict()

    try:
        validate_required_fields(req, REQUIRED_SUBMISSION_REQUEST_FIELDS)
        filename, mime, f = get_submission_file_info(request)
    except ValidationError as e:
        logger.error(f"Invalid submission request: {e}")
        return http_error(
            message=e.message,
            status_code=e.status,
            **e.extras,
        )
    except Exception as e:
        logger.error(f"Failed to get submission file info: {e}")
        return http_error(
            message=str(e),
            status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
        )

    logger.info("prepare sending submission request")
    # form request to cluster-management api
    gpu_type = request.form.get("gpu_type")
    submission_mode = request.form.get("submission_mode")
    leaderboard_name = request.form.get("leaderboard")
    base = get_cluster_manager_endpoint()
    url = f"{base}/submission/{leaderboard_name}/{gpu_type}/{submission_mode}"
    files = {
        # requests expects (filename, fileobj, content_type)
        "file": (filename, f.stream, mime),
    }
    headers = {
        WEB_AUTH_HEADER: web_token,
    }

    logger.info("send submission request to leaderboard")
    try:
        resp = requests.post(url, headers=headers, files=files, timeout=180)
    except requests.RequestException as e:
        logger.error(f"forward failed: {e}")
        return jsonify({"error": f"forward failed: {e}"}), 502

    try:
        payload = resp.json()
        message = (
            payload.get("message") or payload.get("detail") or resp.reason
        )
        if resp.status_code == 200:
            return http_success(
                message="submission success, please refresh submission history",
                data=payload,
            )
        else:
            return http_error(
                message=message,
                status_code=http.HTTPStatus(resp.status_code),
                data=payload,
            )
    except Exception as e:
        logger.error(f"faild to submit request: {e}")
        return http_error(
            message=f"{e}",
            status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
        )


@submission_bp.route("/submissions", methods=["GET"])
@login_required
def list_submissions():
    """
    GET /submissions?leaderboard_id=123&&limit=20&offset=0
    limit & offset are used for pagination
    """
    # TODO(elainewy): currently we only fetch the user's all submissions, but we do not have details of:
    # submit method: discord-bot vs cli vs web
    # submit request info: mode and gpu type
    # this could be a followup to provide more information
    logger.info("list submission request is received")

    user_id, _ = get_id_and_username_from_session()
    leaderboard_id = request.args.get("leaderboard_id", type=int)
    limit = request.args.get("limit", default=20, type=int)
    offset = request.args.get("offset", default=0, type=int)

    if leaderboard_id is None or user_id is None:
        return http_error(
            message="leaderboard_id and user_id are required (int)",
            code=10000 + http.HTTPStatus.BAD_REQUEST.value,
            status_code=http.HTTPStatus.BAD_REQUEST,
        )
    # clamp limit
    limit = max(1, min(limit, 100))
    try:
        items, total = list_user_submissions_with_status(
            leaderboard_id=leaderboard_id,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        logger.error(
            f"failed to fetch submissions for leaderboard {leaderboard_id}: {e}"
        )
        return http_error(
            message=f"failed to fetch submissions for leaderboard {leaderboard_id}",
            code=10000 + http.HTTPStatus.INTERNAL_SERVER_ERROR.value,
            status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
        )

    return http_success(
        data={
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset,
        },
    )


def get_cluster_manager_endpoint():
    """
    Return OAuth2 provider information.
    """
    env_var = os.getenv("DISCORD_CLUSTER_MANAGER_API_BASE_URL", "")
    if not env_var:
        logger.warning("DISCORD_CLUSTER_MANAGER_API_BASE_URL is not set!!!")
    return env_var


def list_user_submissions_with_status(
    leaderboard_id: int,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[dict[str, Any]], int]:
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                s.id               AS submission_id,
                s.leaderboard_id,
                s.file_name,
                s.submission_time            AS submitted_at,
                s.done                       AS submissoin_done,
                j.status,
                j.error,
                j.last_heartbeat,
                j.created_at      AS job_created_at
            FROM leaderboard.submission AS s
            LEFT JOIN leaderboard.submission_job_status AS j
                ON j.submission_id = s.id
            WHERE s.leaderboard_id = %s
                AND s.user_id = %s
            ORDER BY s.submission_time DESC
            LIMIT %s OFFSET %s
            """,
            (leaderboard_id, user_id, limit, offset),
        )
        rows = cur.fetchall()
        items = [
            {
                "submission_id": r[0],
                "leaderboard_id": r[1],
                "file_name": r[2],
                "submitted_at": r[3],
                "submission_done": r[4],
                "status": r[5],
                "error": r[6],
                "last_heartbeat": r[7],
                "job_created_at": r[8],
            }
            for r in rows
        ]
        cur.execute(
            """
            SELECT COUNT(*) AS total
            FROM leaderboard.submission AS s
            WHERE s.leaderboard_id = %s
                AND s.user_id = %s
            """,
            (leaderboard_id, user_id),
        )
        row = cur.fetchone()
        if row is None:
            return [], 0
        (total,) = row
        return items, total


def get_user_token(user_id: int) -> Optional[str]:
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT web_auth_id
            FROM leaderboard.user_info
            WHERE id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
        # row will be a tuple like (token,) or None
        return row[0] if row else None


def log_rate_limit():
    rl = limiter.current_limit
    used = remaining = limit_ = reset_in = None
    if rl:
        limit_ = int(rl.limit.amount)
        remaining = max(0, int(rl.remaining))
        used = limit_ - remaining
        reset_in = max(0, int(rl.reset_at - time.time()))
    logger.info(f"rate limit: {limit_},used {used}, reset{reset_in}")
