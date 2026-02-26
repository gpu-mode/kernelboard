from datetime import datetime, timezone

from kernelboard.lib.time import _to_time_left, format_datetime, to_time_left


def test_to_time_left():
    assert (
        _to_time_left(
            "2025-03-25 12:00:00+00:00",
            datetime(2025, 3, 24, 0, 0, 0, tzinfo=timezone.utc),
        )
        == "1 day 12 hours remaining"
    )
    assert (
        _to_time_left(
            "2025-03-24 12:00:00+00:00",
            datetime(2025, 3, 24, 0, 0, 0, tzinfo=timezone.utc),
        )
        == "0 days 12 hours remaining"
    )
    assert (
        _to_time_left(
            "2025-03-26 12:00:00+00:00",
            datetime(2025, 3, 24, 11, 0, 0, tzinfo=timezone.utc),
        )
        == "2 days 1 hour remaining"
    )
    assert (
        _to_time_left(
            datetime(2025, 3, 25, 12, 0, 0, tzinfo=timezone.utc),
            datetime(2025, 3, 24, 0, 0, 0, tzinfo=timezone.utc),
        )
        == "1 day 12 hours remaining"
    )

    assert to_time_left("1970-01-01 00:00:00+00:00") == "ended"

    assert to_time_left("gibberish") is None


def test_format_datetime():
    assert (
        format_datetime(datetime(2025, 3, 24, 12, 0, 0))
        == "2025-03-24 12:00 UTC"
    )
    assert format_datetime("2025-03-24T12:00:00Z") == "2025-03-24 12:00 UTC"
