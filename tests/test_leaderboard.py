def kernelbot_leaderboard_payload(rankings=None, description="description"):
    return {
        "rankings": rankings
        if rankings is not None
        else {
            "H100": [
                {"user_name": "Alice", "score": 1.25, "file_name": "submission.py"}
            ]
        },
        "leaderboard": {
            "name": "conv2d",
            "deadline": "2026-06-29T17:00:00-07:00",
            "lang": "py",
            "description": description,
            "reference": "def ref():\\n    pass",
            "benchmarks": [{"n": 32}],
            "gpu_types": ["H100"],
        },
    }


def view_from_payload(payload):
    from kernelboard.lib.kernelbot_client import to_leaderboard_view

    return to_leaderboard_view(payload)


def test_leaderboard_view():
    view = view_from_payload(kernelbot_leaderboard_payload())

    assert view["name"] == "conv2d"
    assert view["rankings"]["H100"][0]["user_name"] == "Alice"


def test_leaderboard_view_formats_language():
    view = view_from_payload(kernelbot_leaderboard_payload())

    assert view["lang"] == "Python"


def test_leaderboard_no_submissions():
    view = view_from_payload(kernelbot_leaderboard_payload(rankings={"H100": []}))

    assert view["rankings"] == {}


def test_leaderboard_preserves_latex_description():
    latex = r"$$\sum_{i=1?^n i$$"
    view = view_from_payload(kernelbot_leaderboard_payload(description=f"{latex} description"))

    assert view["description"] == f"{latex} description"
