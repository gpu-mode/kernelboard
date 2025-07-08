import os
from flask import Blueprint, current_app as app
from kernelboard.lib.db import get_db_connection
from kernelboard.lib.status_code import HttpStatusCode, httpSuccess, httpError, httpSuccess
from kernelboard.lib.redis_connection import create_redis_connection
from urllib.parse import urlparse


blueprint = Blueprint('health', __name__, url_prefix='/health')

@blueprint.route('')
def health():
    all_checks_passed = True

    try:
        db_conn = get_db_connection()
        with db_conn.cursor() as cur:
            cur.execute("SELECT 1")
    except Exception as e:
        app.logger.error(f"Database health check failed: {e}")
        all_checks_passed = False

    cert_reqs = os.getenv('REDIS_SSL_CERT_REQS')
    redis_conn = create_redis_connection(cert_reqs=cert_reqs)
    if redis_conn == None:
        app.logger.error("redis_conn is None. Is REDIS_URL set?")
        all_checks_passed = False
    else:
        try:
            redis_conn.ping()
        except Exception as e:
            app.logger.error(f"Redis health check failed: {e}")
            all_checks_passed = False

    if all_checks_passed:
        return httpSuccess({
            'status': 'healthy',
            'service': 'kernelboard'
        })
    else:
        return httpError(
            message="Kernelboard is unhealthy",
            code=10404,
            status_code=HttpStatusCode.INTERNAL_SERVER_ERROR,
            data={"status": "unhealthy", "service": "kernelboard"}
            )
