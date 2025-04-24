from flask import Blueprint, current_app as app
from .db import get_db_connection


blueprint = Blueprint('health', __name__, url_prefix='/health')


@blueprint.route('')
def health():
    all_checks_passed = True

    conn = get_db_connection()
    try:
        conn.cursor().execute("SELECT 1")
    except:
        app.logger.error("Database health check failed")
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
