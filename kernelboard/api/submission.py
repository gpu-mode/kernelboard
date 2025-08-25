import http
from flask import Blueprint, request, jsonify, current_app
import requests
from kernelboard.lib.auth_utils import get_id_and_username_from_session, get_user_token, is_auth
from kernelboard.lib.error import ValidationError, validate_required_fields
from kernelboard.lib.file_handler import get_submission_file_info
from kernelboard.lib.status_code import http_error
import logging


logger = logging.getLogger(__name__)
sub_bp = Blueprint("submisison_api", __name__, url_prefix="/submission")


REQUIRED_SUBMISSION_REQUEST_FIELDS = ["file","leaderboard_","gpu_type", "submission_mode"]
SUBMISSION_API_BASE = "https://your.external.api/submission"
WEB_AUTH_HEADER = "X-Web-Auth-Id"
MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB max file size


@sub_bp.before_app_request
def _limit_size():
    current_app.config.setdefault("MAX_CONTENT_LENGTH", MAX_CONTENT_LENGTH)

@sub_bp.route("/submission", methods=["POST"])
def submission():
    # make sure user is logged in
    if not is_auth():
        return http_error(
            message="cannnot get user id, please log in first, if this is unexpected, please contact the gpumode administrator",
            code=10000 + http.HTTPStatus.UNAUTHORIZED.value,
            status_code=http.HTTPStatus.UNAUTHORIZED,
        )
    user_id, username = get_id_and_username_from_session()
    
    web_token = get_user_token(user_id)
    if not web_token:
        return http_error(
            message="cannot find user info from db for user %s, if this is a bug, please contact the gpumode administrator" % username,
            code=10000 + http.HTTPStatus.INTERNAL_SERVER_ERROR.value,
            status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
        )

    req = request.form.to_dict()
    try:
        validate_required_fields(req, REQUIRED_SUBMISSION_REQUEST_FIELDS)
        filename, mime, f = get_submission_file_info(request)
    except ValidationError as e:
        return http_error(
            message=e.message,
            code=e.code,
            status_code=e.status,
            **e.extras,
        )
    except Exception as e:
        return http_error(
            message=str(e),
            code=10000 + http.HTTPStatus.INTERNAL_SERVER_ERROR.value,
            status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
        )

    # form post request to external api
    gpu_type = request.form.get("gpu_type")
    submission_mode = request.form.get("submission_mode")
    leaderboard_name = request.form.get("leaderboard_name")

    url = f"{SUBMISSION_API_BASE}/{leaderboard_name}/{gpu_type}/{submission_mode}"

    files = {
        # requests expects (filename, fileobj, content_type)
        "file": (filename, f.stream, mime),
    }
    headers = {
        WEB_AUTH_HEADER: web_token,
    }

    try:
        resp = requests.post(url, headers=headers, files=files, timeout=180)
    except requests.RequestException as e:
        return jsonify({"error": f"forward failed: {e}"}), 502

    # Pass-through response
    try:
        data = resp.json()
        return jsonify(data), resp.status_code
    except ValueError:
        return resp.text, resp.status_code, {
            "Content-Type": resp.headers.get("Content-Type", "text/plain")
        }
