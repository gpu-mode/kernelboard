import logging
import os
import time
from datetime import datetime, timedelta, timezone
from http import HTTPStatus

import requests
from flask import Blueprint, Response

from kernelboard.lib.status_code import http_error, http_success

logger = logging.getLogger(__name__)

events_bp = Blueprint("events_api", __name__, url_prefix="/events")

# Simple in-memory cache
_cache = {
    "data": None,
    "timestamp": 0,
}
CACHE_TTL_SECONDS = 300  # 5 minutes
CALENDAR_NAME = "GPU MODE Upcoming Lectures"
CALENDAR_FILENAME = "gpu-mode-upcoming-lectures.ics"


def _parse_datetime(value):
    """Parse an ISO 8601 value and normalize it to UTC."""
    if not isinstance(value, str) or not value:
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def _escape_ical_text(value):
    """Escape a value used by an iCalendar TEXT property."""
    normalized = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    return (
        normalized.replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(";", "\\;")
        .replace(",", "\\,")
    )


def _fold_ical_line(line):
    """Fold an iCalendar content line at 75 UTF-8 octets."""
    remaining = line.encode("utf-8")
    folded = []
    first_line = True

    while remaining:
        limit = 75 if first_line else 74
        split_at = min(limit, len(remaining))

        # Do not split in the middle of a multi-byte UTF-8 character.
        while split_at < len(remaining) and remaining[split_at] & 0xC0 == 0x80:
            split_at -= 1

        chunk = remaining[:split_at].decode("utf-8")
        folded.append(chunk if first_line else f" {chunk}")
        remaining = remaining[split_at:]
        first_line = False

    return "\r\n".join(folded)


def _render_icalendar(events, now=None):
    """Render upcoming Discord events as an RFC 5545 calendar feed."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now = now.astimezone(timezone.utc)
    timestamp = now.strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//GPU MODE//Upcoming Lectures//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_escape_ical_text(CALENDAR_NAME)}",
        "REFRESH-INTERVAL;VALUE=DURATION:PT5M",
        "X-PUBLISHED-TTL:PT5M",
    ]

    for event in events:
        event_id = event.get("id")
        start = _parse_datetime(event.get("scheduled_start_time"))
        scheduled_end = _parse_datetime(event.get("scheduled_end_time"))

        if not event_id or start is None:
            continue

        # Match the frontend: an event remains upcoming until its end, when set.
        if (scheduled_end or start) < now:
            continue

        end = scheduled_end
        if end is None or end <= start:
            end = start + timedelta(hours=1)

        event_url = str(event.get("event_url") or "").replace("\r", "").replace("\n", "")
        description = str(event.get("description") or "").strip()
        if event_url:
            description = "\n\n".join(
                part for part in (description, f"View on Discord: {event_url}") if part
            )

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:discord-{_escape_ical_text(event_id)}@gpumode.com",
            f"DTSTAMP:{timestamp}",
            f"DTSTART:{start.strftime('%Y%m%dT%H%M%SZ')}",
            f"DTEND:{end.strftime('%Y%m%dT%H%M%SZ')}",
            f"SUMMARY:{_escape_ical_text(event.get('name') or 'GPU MODE Lecture')}",
            f"DESCRIPTION:{_escape_ical_text(description)}",
            "LOCATION:GPU MODE Discord",
            "STATUS:CONFIRMED",
            "TRANSP:TRANSPARENT",
        ])
        if event_url:
            lines.append(f"URL:{event_url}")
        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold_ical_line(line) for line in lines) + "\r\n"


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


@events_bp.route("/calendar.ics", methods=["GET"])
def calendar_feed():
    """Return upcoming Discord scheduled events as an iCalendar feed."""
    try:
        calendar = _render_icalendar(_get_discord_events())
        return Response(
            calendar,
            content_type="text/calendar; charset=utf-8",
            headers={
                "Cache-Control": f"public, max-age={CACHE_TTL_SECONDS}",
                "Content-Disposition": f'inline; filename="{CALENDAR_FILENAME}"',
            },
        )
    except Exception as e:
        logger.error(f"Error rendering calendar feed: {e}")
        return http_error(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            message=f"Internal server error: {str(e)}",
        )
