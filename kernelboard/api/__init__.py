from flask import Blueprint
from werkzeug.exceptions import HTTPException
from kernelboard.lib.status_code import httpError, httpSuccess
from kernelboard.api.leaderboard import leaderboard_bp
from kernelboard.api.leaderboardMetadata import leaderboard_metadata_bp

api = Blueprint("api", __name__, url_prefix="/api")


# handler for all http exceptions using abort, e.g. 404, 500
@api.app_errorhandler(HTTPException)
def handle_api_http_exception(e):
    return httpError(message=e.description, code=10000 + e.code, status_code=e.code)


@api.route("/about")
def get_about():
    return httpSuccess(data={"message": "Kernelboard, your friendly leaderboard."})

def register_api_routes(app):
    api.register_blueprint(leaderboard_bp)
    api.register_blueprint(leaderboard_metadata_bp)
    app.register_blueprint(api)
