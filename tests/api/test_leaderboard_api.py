from kernelboard.lib.db import get_db_connection


def test_leaderboard(client):
    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200
    assert b"conv2d" in response.data


def test_nonexistent_leaderboard(client):
    response = client.get("/api/leaderboard/1000000")
    assert response.status_code == 404


def test_leaderboard_no_submissions(client, app):
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE leaderboard.submission SET leaderboard_id = 340 WHERE leaderboard_id = 339"
            )
            conn.commit()  # Commit update so the web reque sees it.

    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200

    res = response.get_json()
    assert res["data"]["rankings"] == {}
