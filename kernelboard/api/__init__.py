from flask import Blueprint
from werkzeug.exceptions import HTTPException
from kernelboard.lib.status_code import http_error, http_success
from kernelboard.api.leaderboard import leaderboard_bp
from kernelboard.api.leaderboard_metadata import leaderboard_metadata_bp


def create_api_blueprint():
    api = Blueprint("api", __name__, url_prefix="/api")

    @api.app_errorhandler(HTTPException)
    def handle_api_http_exception(e):
        return http_error(
            message=e.description, code=10000 + e.code, status_code=e.code
        )

    @api.route("/about")
    def get_about():
        return http_success(
            data={
                "message": "Kernelboard, your friendly leaderboard."
            })

    api.register_blueprint(leaderboard_bp)
    api.register_blueprint(leaderboard_metadata_bp)

    return api
