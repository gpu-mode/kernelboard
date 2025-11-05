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
from typing import Any, List, Tuple
import json
from typing import Any, Tuple, List
import json
import base64
import textwrap


logger = logging.getLogger(__name__)

submission_bp = Blueprint("submission_bp", __name__)

REQUIRED_SUBMISSION_REQUEST_FIELDS = [
    "leaderboard_id",
    "leaderboard",
    "gpu_type",
    "submission_mode",
]


WEB_AUTH_HEADER = "X-Web-Auth-Id"
MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1MB max file size


@submission_bp.route("/submission", methods=["POST"])
@login_required
@limiter.limit(
    "60 per minute",
    exempt_when=lambda: not current_user.is_authenticated,  # ignore unauthenticated, since they won't hit the api
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
        message = payload.get("message") or payload.get("detail") or resp.reason
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
        sql, params = _query_list_submission(leaderboard_id, user_id, limit, offset)
        cur.execute(sql, params)
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
                "runs": json.loads(r[9]) if isinstance(r[9], str) else (r[9] or []),
            }
            for r in rows
        ]

        for item in items:
            for run in item["runs"]:
                report = toReport(run)
                run["report"] = report
                run["result"] = {}
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
        total = int(row[0]) if row else 0
    return items, total


def toReport(run: any):
    mode = run["mode"]
    passed = run["passed"]
    result = run["result"]
    compilation = run["compilation"]

    report = {}

    # if crash, just return empty report
    if not _is_crash_report(compilation, passed):
        log = generate_report_by_type(mode, result)
        if log:
            report = {"log": log}
    return report


def generate_report_by_type(mode, result):
    if mode == "test":
        return make_test_log(result)
    elif mode == "benchmark":
        return make_benchmark_log(result)
    elif mode == "profile":
        return make_profile_log(result)
    elif mode == "leaderboard":
        return make_benchmark_log(result)
    return ""


def make_test_log(result: dict) -> str:
    test_log = []
    for i in range(len(result)):
        status = result.get(f"test.{i}.status", None)
        spec = result.get(f"test.{i}.spec", "<Error>")
        if status is None:
            break
        if status == "pass":
            test_log.append(f"✅ {spec}")
            msg = result.get(f"test.{i}.message", None)
            if msg:
                test_log.append(f"> {msg.replace('\\n', '\n')}")
        elif status == "fail":
            test_log.append(f"❌ {spec}")
            error = result.get(f"test.{i}.error", "No error information available")
            if error:
                test_log.append(f"> {error.replace('\\n', '\n')}")
    if len(test_log) > 0:
        return str.join("\n", test_log)
    else:
        return "❗ Could not find any test cases"


def make_benchmark_log(result: dict) -> str:
    num_bench = int(result.get("benchmark-count", 0))

    def log_one(base_name):
        status = result.get(f"{base_name}.status")
        spec = result.get(f"{base_name}.spec")
        if status == "fail":
            bench_log.append(f"❌ {spec} failed testing:\n")
            bench_log.append(result.get(f"{base_name}.error"))
            return
        mean = result.get(f"{base_name}.mean")
        err = result.get(f"{base_name}.err")
        best = result.get(f"{base_name}.best")
        worst = result.get(f"{base_name}.worst")

        bench_log.append(f"{spec}")
        bench_log.append(f" ⏱ {format_time(mean, err)}")
        if best is not None and worst is not None:
            bench_log.append(f" ⚡ {format_time(best)} 🐌 {format_time(worst)}")

    bench_log = []
    for i in range(num_bench):
        log_one(f"benchmark.{i}")
        bench_log.append("")
    if len(bench_log) > 0:
        return "\n".join(bench_log)
    else:
        return "❗ Could not find any benchmarks"


def make_profile_log(result: dict) -> str:
    num_bench = int(result.get("benchmark-count", 0))

    def log_one(base_name):
        spec = result.get(f"{base_name}.spec")
        report: str = result.get(f"{base_name}.report", "")
        if not report:
            return ""
        report = base64.b64decode(report.encode("utf-8"), b"+*").decode("utf-8")
        report = textwrap.indent(report, "  ")
        bench_log.append(f"{spec}\n")
        bench_log.append(report)

    bench_log = []
    for i in range(num_bench):
        log_one(f"benchmark.{i}")
        bench_log.append("")

    if len(bench_log) > 0:
        return "\n".join(bench_log)
    else:
        return "❗ Could not find any profiling data"


def make_benchmark_log(result: dict) -> str:
    num_bench = int(result.get("benchmark-count", 0))

    def log_one(base_name):
        status = result.get(f"{base_name}.status")
        spec = result.get(f"{base_name}.spec")
        if status == "fail":
            bench_log.append(f"❌ {spec} failed testing:\n")
            bench_log.append(result.get(f"{base_name}.error"))
            return

        mean = result.get(f"{base_name}.mean")
        err = result.get(f"{base_name}.err")
        best = result.get(f"{base_name}.best")
        worst = result.get(f"{base_name}.worst")

        bench_log.append(f"{spec}")
        bench_log.append(f" ⏱ {format_time(mean, err)}")
        if best is not None and worst is not None:
            bench_log.append(f" ⚡ {format_time(best)} 🐌 {format_time(worst)}")

    bench_log = []
    for i in range(num_bench):
        log_one(f"benchmark.{i}")
        bench_log.append("")

    if len(bench_log) > 0:
        return "\n".join(bench_log)
    else:
        return "❗ Could not find any benchmarks"


def _is_crash_report(compilation: dict, passed: bool):
    if not passed:
        return True
    is_success = compilation.get("success", False)
    if compilation and not is_success:
        return True
    return False


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


def _query_list_submission(
    leaderboard_id: int,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> tuple[str, tuple]:
    sql = """
            SELECT
                s.id                AS submission_id,
                s.leaderboard_id,
                s.file_name,
                s.submission_time   AS submitted_at,
                s.done              AS submission_done,
                j.status,
                j.error,
                j.last_heartbeat,
                j.created_at        AS job_created_at,
                COALESCE(
                    (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                        'start_time', r.start_time,
                        'end_time',   r.end_time,
                        'mode',       r.mode,
                        'passed',     r.passed,
                        'score',      r.score,
                        'meta',       COALESCE(r.meta::jsonb, '{}'::jsonb),
                        'result',    COALESCE(r.result::jsonb, '{}'::jsonb),
                        'compilation', COALESCE(r.compilation::jsonb, '{}'::jsonb)
                        )
                        ORDER BY r.start_time
                    )
                    FROM leaderboard.runs AS r
                    WHERE r.submission_id = s.id AND r.secret = false
                    ),
                    '[]'::jsonb
                )::json AS runs_json
            FROM leaderboard.submission AS s
            LEFT JOIN leaderboard.submission_job_status AS j
              ON j.submission_id = s.id
            WHERE s.leaderboard_id = %s
              AND s.user_id = %s
            ORDER BY s.submission_time DESC
            LIMIT %s OFFSET %s
            """
    params = (leaderboard_id, user_id, limit, offset)
    return sql, params


def format_time(
    nanoseconds: float | str, err: Optional[float | str] = None
):  # noqa: C901
    if nanoseconds is None:
        logging.warning("Expected a number, got None", stack_info=True)
        return "–"

    # really ugly, but works for now
    nanoseconds = float(nanoseconds)

    scale = 1  # nanoseconds
    unit = "ns"
    if nanoseconds > 2_000_000:
        scale = 1000_000
        unit = "ms"
    elif nanoseconds > 2000:
        scale = 1000
        unit = "µs"

    time_in_unit = nanoseconds / scale
    if err is not None:
        err = float(err)
        err /= scale
    if time_in_unit < 1:
        if err:
            return f"{time_in_unit} ± {err} {unit}"
        else:
            return f"{time_in_unit} {unit}"
    elif time_in_unit < 10:
        if err:
            return f"{time_in_unit:.2f} ± {err:.3f} {unit}"
        else:
            return f"{time_in_unit:.2f} {unit}"
    elif time_in_unit < 100:
        if err:
            return f"{time_in_unit:.1f} ± {err:.2f} {unit}"
        else:
            return f"{time_in_unit:.1f} {unit}"
    else:
        if err:
            return f"{time_in_unit:.0f} ± {err:.1f} {unit}"
        else:
            return f"{time_in_unit:.0f} {unit}"
