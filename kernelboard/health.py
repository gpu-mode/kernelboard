from flask import Blueprint, current_app as app
from .db import get_db_connection
from urllib.parse import urlparse
import redis


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

    redis_url = urlparse(app.config['REDIS_URL'])
    if not redis_url:
        app.logger.error("REDIS_URL is not set in the application configuration.")
        all_checks_passed = False
    else:
        try:
            redis_conn = redis.Redis(
                host=redis_url.hostname,
                port=redis_url.port,
                password=redis_url.password,
                ssl=(redis_url.scheme == "rediss"),
                ssl_cert_reqs=None)
            redis_conn.ping()
        except Exception as e:
            app.logger.error(f"Redis health check failed: {e}")
            all_checks_passed = False

    if all_checks_passed:
        return {
            'status': 'healthy',
            'service': 'kernelboard'
        }, 200
    else:
        return {
            'status': 'unhealthy',
            'service': 'kernelboard'
        }, 500
