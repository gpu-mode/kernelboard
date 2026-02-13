from flask import Blueprint
from werkzeug.exceptions import HTTPException

from kernelboard.api.auth import auth_bp
from kernelboard.api.events import events_bp
from kernelboard.api.leaderboard import leaderboard_bp
from kernelboard.api.leaderboard_summaries import leaderboard_summaries_bp
from kernelboard.api.news import news_bp
from kernelboard.api.submission import submission_bp
from kernelboard.lib.status_code import http_error, http_success


def create_api_blueprint():
    """
    Creates the main API blueprint for /api routes.

    Developer Guidelines:

    1. For simple routes (e.g., /about, /ping), define them directly
       in this function using @api.route(). These should be lightweight
        and self-contained.

       Example:
           @api.route("/ping", methods=["GET"])
           def ping():
               return http_success(data="pong")

    2. For complex, grouped, or growing route sets (e.g., leaderboard, jobs),
       define them in their own sub-blueprints under api/routes/ and
       register them here.

       Example:
           from .routes.leaderboard import leaderboard_bp
           api.register_blueprint(leaderboard_bp)

    3. Always specify HTTP methods explicitly for routes that are not GET.

       Example:
           @api.route("/submit", methods=["POST"])
           def submit():
               ...

    4. Use http_success() and http_error() for consistent API responses.
    """

    api = Blueprint("api", __name__, url_prefix="/api")

    # register error handlers, use can use abort() to trigger .items()
    @api.app_errorhandler(HTTPException)
    def handle_api_http_exception(e):
        return http_error(
            message=e.description, code=10000 + e.code, status_code=e.code
        )

    # TODO(yangw-dev): remove this after the testing is complete
    @api.route("/about")
    def get_about():
        return http_success(
            data={"message": "Kernelboard, your friendly leaderboard."}
        )

    # register blueprints
    api.register_blueprint(leaderboard_bp)
    api.register_blueprint(news_bp)
    api.register_blueprint(leaderboard_summaries_bp)
    api.register_blueprint(auth_bp)
    api.register_blueprint(submission_bp)
    api.register_blueprint(events_bp)
    return api
