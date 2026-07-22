from datetime import datetime, timezone
from unittest.mock import patch

from flask import Blueprint, Flask

from kernelboard.api.events import _render_icalendar, events_bp


def _events_client():
    app = Flask(__name__)
    api = Blueprint("events_test_api", __name__, url_prefix="/api")
    api.register_blueprint(events_bp)
    app.register_blueprint(api)
    return app.test_client()


def test_calendar_feed_returns_upcoming_events():
    events = [
        {
            "id": "123456",
            "name": "Fast kernels, from A;B",
            "description": "Line one\nLine two",
            "scheduled_start_time": "2099-07-27T18:00:00+00:00",
            "scheduled_end_time": "2099-07-27T19:20:00+00:00",
            "event_url": "https://discord.com/events/1/123456",
        }
    ]

    with patch("kernelboard.api.events._get_discord_events", return_value=events):
        response = _events_client().get("/api/events/calendar.ics")

    calendar = response.get_data(as_text=True)
    assert response.status_code == 200
    assert response.content_type == "text/calendar; charset=utf-8"
    assert response.headers["Content-Disposition"] == (
        'inline; filename="gpu-mode-upcoming-lectures.ics"'
    )
    assert "UID:discord-123456@gpumode.com\r\n" in calendar
    assert "DTSTART:20990727T180000Z\r\n" in calendar
    assert "DTEND:20990727T192000Z\r\n" in calendar
    assert "SUMMARY:Fast kernels\\, from A\\;B\r\n" in calendar
    assert "DESCRIPTION:Line one\\nLine two\\n\\nView on Discord: https://discord.com" in calendar
    assert "TRANSP:TRANSPARENT\r\n" in calendar


def test_calendar_renderer_filters_past_and_defaults_missing_end_time():
    events = [
        {
            "id": "past",
            "name": "Past lecture",
            "scheduled_start_time": "2026-07-20T18:00:00+00:00",
            "scheduled_end_time": "2026-07-20T19:00:00+00:00",
        },
        {
            "id": "current",
            "name": "Current lecture",
            "scheduled_start_time": "2026-07-22T18:00:00+00:00",
            "scheduled_end_time": "2026-07-22T19:00:00+00:00",
        },
        {
            "id": "future",
            "name": "Future lecture",
            "scheduled_start_time": "2026-07-23T18:00:00Z",
            "scheduled_end_time": None,
        },
        {
            "id": "invalid",
            "name": "Invalid lecture",
            "scheduled_start_time": "not-a-date",
        },
    ]

    calendar = _render_icalendar(
        events,
        now=datetime(2026, 7, 22, 18, 30, tzinfo=timezone.utc),
    )

    assert "Past lecture" not in calendar
    assert "Invalid lecture" not in calendar
    assert "SUMMARY:Current lecture\r\n" in calendar
    assert "SUMMARY:Future lecture\r\n" in calendar
    assert "DTSTART:20260723T180000Z\r\n" in calendar
    assert "DTEND:20260723T190000Z\r\n" in calendar


def test_calendar_renderer_folds_long_utf8_lines_to_75_octets():
    calendar = _render_icalendar(
        [
            {
                "id": "long-title",
                "name": "GPU kernels 🚀 " * 20,
                "scheduled_start_time": "2099-01-01T10:00:00Z",
                "scheduled_end_time": "2099-01-01T11:00:00Z",
            }
        ],
        now=datetime(2026, 7, 22, tzinfo=timezone.utc),
    )

    assert all(len(line.encode("utf-8")) <= 75 for line in calendar.split("\r\n"))
