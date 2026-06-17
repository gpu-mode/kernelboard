import logging
import os
from http import HTTPStatus
from typing import Any

import requests

logger = logging.getLogger(__name__)


def get_cluster_manager_endpoint():
    env_var = os.getenv("DISCORD_CLUSTER_MANAGER_API_BASE_URL", "")
    if not env_var:
        logger.warning("DISCORD_CLUSTER_MANAGER_API_BASE_URL is not set")
    return env_var.rstrip("/")


def get_leaderboard_rankings(leaderboard_id: int) -> tuple[dict[str, Any] | None, int]:
    try:
        response = requests.get(
            f"{get_cluster_manager_endpoint()}/leaderboard/{leaderboard_id}/rankings",
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.exception("kernelbot leaderboard request failed: %s", exc)
        return None, HTTPStatus.BAD_GATEWAY

    if response.status_code == HTTPStatus.NOT_FOUND:
        return None, HTTPStatus.NOT_FOUND

    if not response.ok:
        logger.error(
            "kernelbot leaderboard request failed: status=%s body=%s",
            response.status_code,
            response.text,
        )
        return None, HTTPStatus.BAD_GATEWAY

    return response.json(), HTTPStatus.OK


def to_leaderboard_view(data: dict[str, Any]):
    from kernelboard.lib.time import to_time_left

    leaderboard_data = data["leaderboard"]
    name = leaderboard_data["name"]
    deadline = leaderboard_data["deadline"]
    time_left = to_time_left(deadline)

    lang = leaderboard_data["lang"]
    if lang == "py":
        lang = "Python"

    description = leaderboard_data["description"] or ""
    description = description.replace("\\n", "\n")

    reference = leaderboard_data["reference"] or ""
    reference = reference.replace("\\n", "\n")

    benchmarks = leaderboard_data.get("benchmarks") or []

    gpu_types = leaderboard_data["gpu_types"]
    gpu_types.sort()

    rankings = {}
    for gpu_type, ranking_ in data["rankings"].items():
        ranking = []
        prev_score = None

        if ranking_ is not None:
            for i, entry in enumerate(ranking_):
                entry["rank"] = i + 1

                if prev_score is not None:
                    entry["prev_score"] = entry["score"] - prev_score
                else:
                    entry["prev_score"] = None

                ranking.append(entry)

                prev_score = entry["score"]

        if len(ranking) > 0:
            rankings[gpu_type] = ranking

    return {
        "name": name,
        "deadline": deadline,
        "time_left": time_left,
        "lang": lang,
        "gpu_types": gpu_types,
        "description": description,
        "reference": reference,
        "benchmarks": benchmarks,
        "rankings": rankings,
    }
