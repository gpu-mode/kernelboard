from unittest.mock import MagicMock, patch


def kernelbot_leaderboard_payload(rankings=None):
    return {
        "rankings": rankings
        if rankings is not None
        else {
            "H100": [
                {
                    "user_name": "Alice",
                    "score": 1.25,
                    "file_name": "submission.py",
                    "submission_id": 123,
                    "submission_count": 2,
                    "submission_time": "2026-06-17T00:00:00Z",
                }
            ],
            "A100": [],
        },
        "leaderboard": {
            "name": "conv2d",
            "deadline": "2026-06-29T17:00:00-07:00",
            "lang": "py",
            "description": "description\\ntext",
            "reference": "def ref():\\n    pass",
            "benchmarks": [{"n": 32}],
            "gpu_types": ["H100", "A100"],
        },
    }


def mock_kernelbot_response(payload=None, status_code=200):
    response = MagicMock()
    response.status_code = status_code
    response.ok = 200 <= status_code < 400
    response.text = ""
    response.json.return_value = payload if payload is not None else kernelbot_leaderboard_payload()
    return response


@patch("kernelboard.lib.kernelbot_client.requests.get")
def test_leaderboard(mock_get, client):
    mock_get.return_value = mock_kernelbot_response()

    response = client.get("/api/leaderboard/339")

    assert response.status_code == 200
    assert b"conv2d" in response.data
    mock_get.assert_called_once_with(
        "test-secret/leaderboard/339/rankings",
        timeout=10,
    )


@patch("kernelboard.lib.kernelbot_client.requests.get")
def test_nonexistent_leaderboard(mock_get, client):
    mock_get.return_value = mock_kernelbot_response(status_code=404)

    response = client.get("/api/leaderboard/1000000")
    assert response.status_code == 404


@patch("kernelboard.lib.kernelbot_client.requests.get")
def test_leaderboard_no_submissions(mock_get, client):
    mock_get.return_value = mock_kernelbot_response(
        kernelbot_leaderboard_payload(rankings={"H100": [], "A100": []})
    )

    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200

    res = response.get_json()
    assert res["data"]["rankings"] == {}


@patch("kernelboard.lib.kernelbot_client.requests.get")
def test_leaderboard_delegates_secret_filtering_to_kernelbot(mock_get, client):
    mock_get.return_value = mock_kernelbot_response(
        kernelbot_leaderboard_payload(
            rankings={
                "H100": [
                    {
                        "user_name": "Bob",
                        "score": -998,
                        "file_name": "visible_public_pass.py",
                        "submission_id": 900002,
                        "submission_count": 1,
                        "submission_time": "2026-06-17T00:00:00Z",
                    }
                ]
            }
        )
    )

    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200

    payload = response.get_json()
    h100_rankings = payload["data"]["rankings"]["H100"]
    ranked_files = {row["file_name"] for row in h100_rankings}

    assert "hidden_secret_fail.py" not in ranked_files
    assert "visible_public_pass.py" in ranked_files
