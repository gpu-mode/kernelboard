
def test_index(client):
    response = client.get("/api/leaderboard-metadata")
    assert response.status_code == 200
    res = response.get_json()
    leaderboards = res.get("data", {}).get("leaderboards", [])
    assert len(leaderboards) > 0


def test_leaderboard_metadata(client):
    """
    Test that the leaderboard IDs are in decreasing order.
    """
    response = client.get("/api/leaderboard-metadata")
    res = response.get_json()
    leaderboards = res.get("data", {}).get("leaderboards", [])

    assert response.status_code == 200
    ids = [leaderboard.get("id") for leaderboard in leaderboards]

    # Check that we have enough data for a meaningful test.
    assert len(ids) > 2

    # Verify that the extracted IDs are in decreasing order
    assert all(
        ids[i] > ids[i + 1] for i in range(len(ids) - 1)
    ), f"Leaderboard IDs are not in decreasing order: {ids}"
