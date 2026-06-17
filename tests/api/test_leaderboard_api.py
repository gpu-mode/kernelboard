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


def test_failed_secret_benchmark_hides_public_leaderboard_run(client, app):
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO leaderboard.submission
                    (id, leaderboard_id, file_name, user_id, code_id, submission_time, done)
                VALUES
                    (900001, 339, 'hidden_secret_fail.py', '123456789012345', 13, NOW(), TRUE),
                    (900002, 339, 'visible_public_pass.py', '234567890123456', 13, NOW(), TRUE),
                    (900003, 339, 'hidden_missing_secret.py', '345678901234567', 13, NOW(), TRUE)
                """
            )
            cur.execute(
                """
                INSERT INTO leaderboard.runs
                    (
                        id,
                        submission_id,
                        start_time,
                        end_time,
                        mode,
                        secret,
                        runner,
                        score,
                        passed,
                        compilation,
                        meta,
                        result,
                        system_info
                    )
                VALUES
                    (
                        900001,
                        900001,
                        NOW(),
                        NOW(),
                        'leaderboard',
                        FALSE,
                        'H100',
                        -999,
                        TRUE,
                        '{}',
                        '{}',
                        '{}',
                        '{}'
                    ),
                    (
                        900002,
                        900001,
                        NOW(),
                        NOW(),
                        'benchmark',
                        TRUE,
                        'H100',
                        NULL,
                        FALSE,
                        '{}',
                        '{}',
                        '{}',
                        '{}'
                    ),
                    (
                        900003,
                        900002,
                        NOW(),
                        NOW(),
                        'leaderboard',
                        FALSE,
                        'H100',
                        -998,
                        TRUE,
                        '{}',
                        '{}',
                        '{}',
                        '{}'
                    ),
                    (
                        900004,
                        900002,
                        NOW(),
                        NOW(),
                        'leaderboard',
                        TRUE,
                        'H100',
                        -998,
                        TRUE,
                        '{}',
                        '{}',
                        '{}',
                        '{}'
                    ),
                    (
                        900005,
                        900003,
                        NOW(),
                        NOW(),
                        'leaderboard',
                        FALSE,
                        'H100',
                        -997,
                        TRUE,
                        '{}',
                        '{}',
                        '{}',
                        '{}'
                    )
                """
            )
            conn.commit()

    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200

    payload = response.get_json()
    h100_rankings = payload["data"]["rankings"]["H100"]
    ranked_files = {row["file_name"] for row in h100_rankings}

    assert "hidden_secret_fail.py" not in ranked_files
    assert "hidden_missing_secret.py" not in ranked_files
    assert "visible_public_pass.py" in ranked_files
