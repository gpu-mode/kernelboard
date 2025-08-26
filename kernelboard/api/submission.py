import http
from typing import Any, List, Tuple
from flask import Blueprint, request, jsonify
import requests
from kernelboard.lib.auth_utils import (
    get_id_and_username_from_session,
    get_user_token,
    is_auth,
)
from kernelboard.lib.db import get_db_connection
from kernelboard.lib.error import ValidationError, validate_required_fields
from kernelboard.lib.file_handler import get_submission_file_info
from kernelboard.lib.status_code import http_error, http_success
import logging
import os

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
MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB max file size


@submission_bp.route("/submission", methods=["POST"])
def submission():
    # make sure user is logged in
    logger.info("submission received")
    if not is_auth():
        logger.error("user did not login")
        return http_error(
            message="cannnot get user id, please log in first, if this is unexpected, please contact the gpumode administrator",
            code=10000 + http.HTTPStatus.UNAUTHORIZED.value,
            status_code=http.HTTPStatus.UNAUTHORIZED,
        )
    user_id, username = get_id_and_username_from_session()
    web_token = get_user_token(user_id)
    if not web_token:
        logger.error(f"user %s missing web token", user_id)
        return http_error(
            message="cannot find user info from db for user %s, if this is a bug, please contact the gpumode administrator"
            % username,
            code=10000 + http.HTTPStatus.INTERNAL_SERVER_ERROR.value,
            status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
        )
    req = request.form.to_dict()

    try:
        validate_required_fields(req, REQUIRED_SUBMISSION_REQUEST_FIELDS)
    except ValidationError as e:
        logger.error(f"Invalid submission request: {e}")
        return http_error(
            message=e.message,
            code=e.code,
            status_code=e.status,
            **e.extras,
        )

    try:
        filename, mime, f = get_submission_file_info(request)
    except ValidationError as e:
        logger.error(f"Invalid file from submission request: {e}")
        return http_error(
            message=e.message,
            code=e.code,
            status_code=e.status,
            **e.extras,
        )
    except Exception as e:
        logger.error(f"Failed to get submission file info: {e}")
        return http_error(
            message=str(e),
            code=10000 + http.HTTPStatus.INTERNAL_SERVER_ERROR.value,
            status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
        )

    logger.info("prepare sending submission request")
    # form post request to external api
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

    logger.info(f"send submission request to leaderboard")
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
                code=10000 + resp.status_code,
                status_code=http.HTTPStatus(resp.status_code),
                data=payload,
            )
    except ValueError as e:
        return http_error(
            message=f"submission failed due to: {e}",
            code=10000 + http.HTTPStatus.BAD_REQUEST.value,
            status_code=http.HTTPStatus.BAD_REQUEST,
        )
    except Exception as e:
        logger.error(f"unexpected error happened: {e}")
        return http_error(
            message=f"unexpected error happened: {e}",
            code=10000 + http.HTTPStatus.INTERNAL_SERVER_ERROR.value,
            status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
        )


@submission_bp.route("/submissions", methods=["GET"])
def list_submissions():
    """
    GET /submissions?leaderboard_id=123&&limit=20&offset=0
    """
    # TODO(elainewy): currently we only fetch the user's all submissions, but we do not have details of:
    # submit method: discord-bot vs cli vs web
    # submit request info: mode and gpu type
    # this could be a followup to provide more information

    logger.info("list submission request is received")
    if not is_auth():
        return http_error(
            message="cannnot get user id, please log in first, if this is unexpected, please contact the gpumode administrator",
            code=10000 + http.HTTPStatus.UNAUTHORIZED.value,
            status_code=http.HTTPStatus.UNAUTHORIZED,
        )
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


def list_user_submissions_with_status(
    leaderboard_id: int,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[dict[str, Any]], int]:
    conn = get_db_connection()
    try:
        with conn:
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
                total = cur.fetchone()[0]
                return items, total
    finally:
        conn.close()


def get_cluster_manager_endpoint():
    """
    Return OAuth2 provider information.
    """
    env_var = os.getenv("DISCORD_CLUSTER_MANAGER_API_BASE_URL", "")
    if not env_var:
        logger.warning("DISCORD_CLUSTER_MANAGER_API_BASE_URL is not set!!!")
    return env_var
