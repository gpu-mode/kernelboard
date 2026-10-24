def test_index(client):
    response = client.get("/api/leaderboard-summaries")
    assert response.status_code == 200
    res = response.get_json()
    leaderboards = res.get("data", {}).get("leaderboards", [])
    assert len(leaderboards) > 0


def test_leaderboard_metadata(client):
    """
    Test that the leaderboard IDs are in decreasing order.
    """
    response = client.get("/api/leaderboard-summaries")
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


def test_empty_ended_leaderboard_is_cached(client, app, monkeypatch):
    from kernelboard.api import leaderboard_summaries as summaries
    from kernelboard.lib.db import get_db_connection

    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE leaderboard.leaderboard SET deadline = NOW() - INTERVAL '1 day'")
            cur.execute("UPDATE leaderboard.runs SET passed = FALSE")
            cur.execute("SELECT id FROM leaderboard.leaderboard")
            leaderboard_ids = [row[0] for row in cur.fetchall()]
        summaries._delete_cached_top_users(summaries._get_redis(), leaderboard_ids)
        conn.commit()

    first = client.get("/api/leaderboard-summaries")
    assert first.status_code == 200
    assert all(lb["top_users"] is None for lb in first.get_json()["data"]["leaderboards"])

    def unexpected_recompute():
        raise AssertionError("Empty ended leaderboards should be served from cache")

    monkeypatch.setattr(summaries, "_get_query_for_ids", unexpected_recompute)
    second = client.get("/api/leaderboard-summaries")
    assert second.status_code == 200
    assert second.get_json() == first.get_json()
