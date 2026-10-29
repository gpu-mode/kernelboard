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


def test_rankings_match_uncached_query_for_selected_competitions(app):
    from kernelboard.api import leaderboard_summaries as summaries
    from kernelboard.lib.db import get_db_connection

    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(summaries._get_query())
            expected = {row[0]['id']: row[0]['top_users'] for row in cur.fetchall()}
            for ids in [(339,), (339, 340), tuple(expected)]:
                cur.execute(summaries._get_query_for_ids(), (ids, ids))
                actual = dict(cur.fetchall())
                assert set(actual) <= set(ids)
                for lb_id in ids:
                    # SQL leaves the order of equal ranks unspecified.
                    def key(user):
                        return (user['rank'], user['score'], user['user_name'])
                    assert sorted(actual.get(lb_id) or [], key=key) == sorted(expected[lb_id] or [], key=key)


def test_slow_rankings_still_serve_metadata_and_can_retry(client, app, monkeypatch):
    from kernelboard.api import leaderboard_summaries as summaries
    from kernelboard.lib.db import get_db_connection

    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE leaderboard.leaderboard SET deadline = NOW() - INTERVAL '1 day'")
            cur.execute("SELECT id FROM leaderboard.leaderboard")
            ids = [row[0] for row in cur.fetchall()]
        summaries._delete_cached_top_users(summaries._get_redis(), ids)
        conn.commit()

    with monkeypatch.context() as patch:
        patch.setattr(summaries, 'RANKING_BUDGET_MS', 50)
        patch.setattr(summaries, 'RANKING_QUERY_TIMEOUT_MS', 25)
        patch.setattr(summaries, '_get_query_for_ids', lambda: """
            SELECT 339, NULL::jsonb FROM pg_sleep(0.2)
            WHERE 339 IN %s AND 339 IN %s
        """)
        response = client.get('/api/leaderboard-summaries')

    assert response.status_code == 200
    assert len(response.get_json()['data']['leaderboards']) == len(ids)
    assert 339 not in summaries._get_cached_top_users(summaries._get_redis(), ids)

    # A cancelled ranking query must not poison the transaction or cache an
    # empty result. The next request should be able to compute real rankings.
    retry = client.get('/api/leaderboard-summaries')
    assert retry.status_code == 200
    assert any(lb['top_users'] for lb in retry.get_json()['data']['leaderboards'])
    assert set(summaries._get_cached_top_users(summaries._get_redis(), ids)) == set(ids)
