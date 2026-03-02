import os
from http import HTTPStatus

from flask import Blueprint
from flask import current_app as app

from kernelboard.lib.db import get_db_connection
from kernelboard.lib.redis_connection import get_redis_connection
from kernelboard.lib.status_code import (
    http_error,
    http_success,
)

blueprint = Blueprint("health", __name__, url_prefix="/health")


@blueprint.route("")
def health():
    all_checks_passed = True

    try:
        db_conn = get_db_connection()
        with db_conn.cursor() as cur:
            cur.execute("SELECT 1")
    except Exception as e:
        app.logger.error(f"Database health check failed: {e}")
        all_checks_passed = False

    cert_reqs = os.getenv("REDIS_SSL_CERT_REQS")
    redis_conn = get_redis_connection(cert_reqs=cert_reqs)
    if redis_conn is None:
        app.logger.error("redis_conn is None. Is REDIS_URL set?")
        all_checks_passed = False
    else:
        try:
            redis_conn.ping()
        except Exception as e:
            app.logger.error(f"Redis health check failed: {e}")
            all_checks_passed = False

    if all_checks_passed:
        return http_success({"status": "healthy", "service": "kernelboard"})
    else:
        return http_error(
            message="Kernelboard is unhealthy",
            code=10500,
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            data={"status": "unhealthy", "service": "kernelboard"},
        )
