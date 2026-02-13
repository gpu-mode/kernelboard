import logging
import os
import time
from http import HTTPStatus

import requests
from flask import Blueprint

from kernelboard.lib.status_code import http_error, http_success

logger = logging.getLogger(__name__)

events_bp = Blueprint("events_api", __name__, url_prefix="/events")

# Simple in-memory cache
_cache = {
    "data": None,
    "timestamp": 0,
}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_discord_events():
    """Fetch scheduled events from Discord API with caching."""
    now = time.time()

    # Return cached data if still valid
    if _cache["data"] is not None and (now - _cache["timestamp"]) < CACHE_TTL_SECONDS:
        logger.info("Returning cached Discord events")
        return _cache["data"]

    bot_token = os.environ.get("DISCORD_BOT_TOKEN")
    guild_id = os.environ.get("DISCORD_GUILD_ID")

    if not bot_token or not guild_id:
        logger.warning("Discord credentials not configured")
        return []

    try:
        url = f"https://discord.com/api/v10/guilds/{guild_id}/scheduled-events"
        headers = {
            "Authorization": f"Bot {bot_token}",
        }

        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        events = response.json()

        # Transform to our API format
        result = []
        for event in events:
            result.append({
                "id": event.get("id"),
                "name": event.get("name"),
                "description": event.get("description", ""),
                "scheduled_start_time": event.get("scheduled_start_time"),
                "scheduled_end_time": event.get("scheduled_end_time"),
                "event_url": f"https://discord.com/events/{guild_id}/{event.get('id')}",
            })

        # Sort by start time (soonest first)
        result.sort(key=lambda x: x.get("scheduled_start_time", ""))

        # Update cache
        _cache["data"] = result
        _cache["timestamp"] = now

        logger.info(f"Fetched {len(result)} Discord events")
        return result

    except requests.RequestException as e:
        logger.error(f"Failed to fetch Discord events: {e}")
        # Return cached data if available, even if stale
        if _cache["data"] is not None:
            return _cache["data"]
        return []


@events_bp.route("", methods=["GET"])
def list_events():
    """Return upcoming Discord scheduled events."""
    try:
        events = _get_discord_events()
        return http_success(data=events)
    except Exception as e:
        logger.error(f"Error fetching events: {e}")
        return http_error(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            message=f"Internal server error: {str(e)}",
        )
