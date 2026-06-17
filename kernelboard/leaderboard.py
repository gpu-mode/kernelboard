from http import HTTPStatus

from flask import Blueprint, abort, render_template

from kernelboard.lib.kernelbot_client import get_leaderboard_rankings, to_leaderboard_view

blueprint = Blueprint("leaderboard", __name__, url_prefix="/leaderboard")


@blueprint.route("/<int:leaderboard_id>")
def leaderboard(leaderboard_id: int):
    data, status_code = get_leaderboard_rankings(leaderboard_id)
    if status_code == HTTPStatus.NOT_FOUND:
        abort(404)
    if status_code != HTTPStatus.OK:
        abort(502)

    view = to_leaderboard_view(data)
    return render_template(
        "leaderboard.html",
        name=view["name"],
        deadline=view["deadline"],
        time_left=view["time_left"],
        lang=view["lang"],
        gpu_types=view["gpu_types"],
        description=view["description"],
        reference=view["reference"],
        rankings=view["rankings"],
    )
