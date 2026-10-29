from kernelboard.lib.db import get_db_connection


def test_leaderboard(client):
    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200
    assert b"conv2d" in response.data


def test_concluded_leaderboard_includes_line_counts(client):
    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200

    payload = response.get_json()
    ranked_items = [
        item
        for ranking in payload["data"]["rankings"].values()
        for item in ranking
    ]

    assert ranked_items
    assert all(isinstance(item.get("line_count"), int) for item in ranked_items)


def test_active_leaderboard_omits_line_counts(client, app):
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE leaderboard.leaderboard
                SET deadline = NOW() + INTERVAL '1 day'
                WHERE id = 339
                """
            )
            conn.commit()

    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200

    payload = response.get_json()
    ranked_items = [
        item
        for ranking in payload["data"]["rankings"].values()
        for item in ranking
    ]

    assert ranked_items
    assert all("line_count" not in item for item in ranked_items)


def test_leaderboard_includes_latest_validation_summary(client, app):
    initial = client.get("/api/leaderboard/339").get_json()
    initial_ids = {
        gpu: [item["submission_id"] for item in items]
        for gpu, items in initial["data"]["rankings"].items()
    }
    gpu_type, rankings = next(iter(initial["data"]["rankings"].items()))
    submission_id = rankings[0]["submission_id"]

    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE leaderboard.leaderboard
                SET task = jsonb_set(
                    task,
                    '{validation}',
                    '{"version": "v1"}'::jsonb
                )
                WHERE id = 339
                """
            )
            cur.execute(
                """
                INSERT INTO leaderboard.submission_validation (
                    submission_id, gpu_type, contract_version,
                    status, passed_shapes, total_shapes, fully_validated,
                    geomean_sync_wall_speedup, result
                )
                VALUES (%s, %s, 'v1',
                        'completed', 8, 8, TRUE, 1.25, '{}')
                """,
                (submission_id, gpu_type),
            )
            conn.commit()

    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200
    returned_rankings = response.get_json()["data"]["rankings"]
    assert {
        gpu: [item["submission_id"] for item in items]
        for gpu, items in returned_rankings.items()
    } == initial_ids
    validated = next(
        item
        for item in returned_rankings[gpu_type]
        if item["submission_id"] == submission_id
    )
    assert validated["validation_status"] == "completed"
    assert validated["validation_shapes_passed"] == 8
    assert validated["validation_shapes_total"] == 8
    assert validated["validation_fully_validated"] is True
    assert validated["validation_geomean_speedup"] == 1.25
    assert validated["validation_contract_version"] == "v1"

    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE leaderboard.submission_validation
                SET status = 'failed',
                    passed_shapes = 0,
                    total_shapes = 0,
                    fully_validated = FALSE
                WHERE submission_id = %s AND gpu_type = %s
                """,
                (submission_id, gpu_type),
            )
            conn.commit()

    failed_response = client.get("/api/leaderboard/339")
    failed_rankings = failed_response.get_json()["data"]["rankings"]
    assert {
        gpu: [item["submission_id"] for item in items]
        for gpu, items in failed_rankings.items()
    } == initial_ids
    failed = next(
        item
        for item in failed_rankings[gpu_type]
        if item["submission_id"] == submission_id
    )
    assert failed["validation_status"] == "failed"


def test_leaderboard_line_counts_support_bytea_code_storage(client, app):
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                ALTER TABLE leaderboard.code_files DROP COLUMN hash;
                ALTER TABLE leaderboard.code_files RENAME COLUMN code TO old_code;
                ALTER TABLE leaderboard.code_files
                    ADD COLUMN code BYTEA NOT NULL DEFAULT '';
                UPDATE leaderboard.code_files
                    SET code = convert_to(old_code, 'UTF8');
                ALTER TABLE leaderboard.code_files ALTER COLUMN old_code DROP NOT NULL;
                ALTER TABLE leaderboard.code_files ALTER COLUMN code DROP DEFAULT;
                """
            )
            conn.commit()

    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200

    payload = response.get_json()
    line_counts = [
        item["line_count"]
        for ranking in payload["data"]["rankings"].values()
        for item in ranking
        if "line_count" in item
    ]

    assert line_counts
    assert all(isinstance(line_count, int) for line_count in line_counts)


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


def test_hacked_submissions_are_hidden_from_public_leaderboard(client, app):
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            submissions = [
                (
                    900011,
                    "hidden_submission_status_hacked.py",
                    "123456789012345",
                    "hacked",
                ),
                (900012, "hidden_job_status_hacked.py", "234567890123456", "active"),
                (900013, "visible_clean_status.py", "345678901234567", "active"),
            ]
            for submission_id, file_name, user_id, status in submissions:
                cur.execute(
                    """
                    INSERT INTO leaderboard.submission
                        (
                            id,
                            leaderboard_id,
                            file_name,
                            user_id,
                            code_id,
                            submission_time,
                            done,
                            status
                        )
                    VALUES
                        (%s, 339, %s, %s, 13, NOW(), TRUE, %s)
                    """,
                    (submission_id, file_name, user_id, status),
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
                            %s,
                            %s,
                            NOW(),
                            NOW(),
                            'leaderboard',
                            FALSE,
                            'H100',
                            %s,
                            TRUE,
                            '{}',
                            '{}',
                            '{}',
                            '{}'
                        ),
                        (
                            %s,
                            %s,
                            NOW(),
                            NOW(),
                            'leaderboard',
                            TRUE,
                            'H100',
                            %s,
                            TRUE,
                            '{}',
                            '{}',
                            '{}',
                            '{}'
                        )
                    """,
                    (
                        submission_id * 10,
                        submission_id,
                        -submission_id,
                        submission_id * 10 + 1,
                        submission_id,
                        -submission_id,
                    ),
                )

            cur.execute(
                """
                INSERT INTO leaderboard.submission_job_status
                    (submission_id, status, created_at, last_heartbeat)
                VALUES
                    (900012, 'hacked', NOW(), NOW())
                """
            )
            conn.commit()

    response = client.get("/api/leaderboard/339")
    assert response.status_code == 200

    payload = response.get_json()
    ranked_files = {
        row["file_name"]
        for row in payload["data"]["rankings"]["H100"]
    }

    assert "hidden_submission_status_hacked.py" not in ranked_files
    assert "hidden_job_status_hacked.py" not in ranked_files
    assert "visible_clean_status.py" in ranked_files


def test_equal_best_runs_keep_one_entry_and_distinct_submission_count(client, app):
    before = client.get("/api/leaderboard/339").get_json()["data"]["rankings"]
    gpu, entries = next(iter(before.items()))
    winner = entries[0]
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO leaderboard.runs (
                    id, submission_id, start_time, end_time, mode, secret,
                    runner, score, passed, compilation, meta, result, system_info
                )
                SELECT 990001, submission_id, start_time, end_time, mode, secret,
                       runner, score, passed, compilation, meta, result, system_info
                FROM leaderboard.runs
                WHERE submission_id = %s AND runner = %s
                    AND NOT secret AND passed AND score = %s
                LIMIT 1
                """,
                (winner["submission_id"], gpu, winner["score"]),
            )
        conn.commit()
    after = client.get("/api/leaderboard/339").get_json()["data"]["rankings"][gpu]
    tied = [item for item in after if item["submission_id"] == winner["submission_id"]]
    assert len(tied) == 1
    assert all(item["score"] == winner["score"] for item in tied)
    assert all(item["submission_count"] == winner["submission_count"] for item in tied)


def test_tied_submissions_keep_earliest_per_account_and_preserve_other_users(client, app):
    before = client.get("/api/leaderboard/339").get_json()["data"]["rankings"]
    gpu, entries = next(iter(before.items()))
    winner = entries[0]
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO leaderboard.user_info (id, user_name) VALUES (%s, %s)",
                ("tie-regression-user", winner["user_name"]),
            )
            for submission_id, new_user in [(990101, False), (990102, False), (990103, True)]:
                cur.execute(
                    """
                    INSERT INTO leaderboard.submission (
                        id, leaderboard_id, file_name, user_id, code_id, submission_time, done, status
                    )
                    SELECT %s, leaderboard_id, 'tie_regression.py',
                           CASE WHEN %s THEN 'tie-regression-user' ELSE user_id END,
                           code_id, submission_time - INTERVAL '1 day', done, status
                    FROM leaderboard.submission WHERE id = %s
                    """,
                    (submission_id, new_user, winner["submission_id"]),
                )
                cur.execute(
                    """
                    INSERT INTO leaderboard.runs (
                        id, submission_id, start_time, end_time, mode, secret,
                        runner, score, passed, compilation, meta, result, system_info
                    )
                    SELECT %s + ROW_NUMBER() OVER (), %s, start_time, end_time, mode, secret,
                           runner, score, passed, compilation, meta, result, system_info
                    FROM leaderboard.runs
                    WHERE submission_id = %s AND runner = %s
                    """,
                    (submission_id * 100, submission_id, winner["submission_id"], gpu),
                )
        conn.commit()
    after = client.get("/api/leaderboard/339").get_json()["data"]["rankings"][gpu]
    matches = [row for row in after if row["user_name"] == winner["user_name"]]
    assert {row["submission_id"] for row in matches} == {990101, 990103}
    assert len(matches) == 2
    assert all(row["score"] == winner["score"] for row in matches)
    original = next(row for row in matches if row["submission_id"] == 990101)
    assert original["submission_count"] == winner["submission_count"] + 2
