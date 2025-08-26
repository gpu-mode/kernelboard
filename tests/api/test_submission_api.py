# tests/test_submission_api.py
import http
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch, MagicMock
import flask_login
import datetime as dt
import requests
import pytest
from kernelboard.lib.db import get_db_connection
from psycopg2.extras import execute_values

_TEST_USER_ID = "333"
_TEST_WEB_AUTH_ID = "111"

def _delete_user_graph(conn, user_id: str) -> None:
    """Idempotent cleanup: remove all rows under a user in FK-safe order."""
    with conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM leaderboard.runs
                WHERE submission_id IN (
                  SELECT id FROM leaderboard.submission WHERE user_id = %s
                )
                """,
                (user_id,),
            )
            cur.execute(
                """
                DELETE FROM leaderboard.submission_job_status
                WHERE submission_id IN (
                  SELECT id FROM leaderboard.submission WHERE user_id = %s
                )
                """,
                (user_id,),
            )
            cur.execute(
                "DELETE FROM leaderboard.submission WHERE user_id = %s",
                (user_id,),
            )
            cur.execute(
                "DELETE FROM leaderboard.user_info WHERE id = %s",
                (user_id,),
            )

@pytest.fixture
def seed_submissions(app, request):
    now = dt.datetime(2025, 1, 1, 0, 0, 0, tzinfo=dt.timezone.utc)
    with app.app_context():
        conn = get_db_connection()
        with conn:
            with conn.cursor() as cur:
                # 1) user_info upsert
                cur.execute(
                    """
                    INSERT INTO leaderboard.user_info (id, user_name, web_auth_id, cli_id, cli_valid)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE
                    SET user_name = EXCLUDED.user_name,
                        web_auth_id = EXCLUDED.web_auth_id,
                        cli_id     = EXCLUDED.cli_id,
                        cli_valid  = EXCLUDED.cli_valid
                    RETURNING id, user_name, web_auth_id, cli_valid
                    """,
                    (_TEST_USER_ID, "test-user", _TEST_WEB_AUTH_ID, None, True),
                )

                # 2) submissions upsert + RETURNING
                submissions = [
                    ("101", "339", _TEST_USER_ID, "1001", "solution_a.py", now),
                    ("102", "339", _TEST_USER_ID, "1002", "solution_b.py", now - dt.timedelta(days=1)),
                ]
                sub_sql = """
                INSERT INTO leaderboard.submission
                    (id, leaderboard_id, user_id, code_id, file_name, submission_time)
                VALUES %s
                ON CONFLICT (id) DO UPDATE
                SET file_name       = EXCLUDED.file_name,
                    submission_time = EXCLUDED.submission_time,
                    user_id         = EXCLUDED.user_id,
                    leaderboard_id  = EXCLUDED.leaderboard_id,
                    code_id         = EXCLUDED.code_id
                RETURNING id, leaderboard_id, user_id, code_id, file_name, submission_time
                """
                sub_ret = execute_values(cur, sub_sql, submissions, fetch=True)
                assert {r[0] for r in sub_ret} == {101, 102}

                # 3) job_status upsert + RETURNING
                job_status = [
                    (101, "running", None, None, now),
                    (102, "pending", None, None, now - dt.timedelta(days=1)),
                ]
                js_sql = """
                INSERT INTO leaderboard.submission_job_status
                    (submission_id, status, error, last_heartbeat, created_at)
                VALUES %s
                ON CONFLICT (submission_id) DO UPDATE
                SET status         = EXCLUDED.status,
                    error          = EXCLUDED.error,
                    last_heartbeat = EXCLUDED.last_heartbeat,
                    created_at     = EXCLUDED.created_at
                RETURNING submission_id, status, created_at
                """
                js_ret = execute_values(cur, js_sql, job_status, fetch=True)
                assert dict((r[0], r[1]) for r in js_ret) == {101: "running", 102: "pending"}

    def _cleanup_user_graph():
        def _cleanup():
            with app.app_context():
                conn2 = get_db_connection()
                _delete_user_graph(conn2, _TEST_USER_ID)
    request.addfinalizer(_cleanup_user_graph)

@pytest.fixture
def prepare(monkeypatch, app, request):
    """
    Factory fixture:
        prepare(auth=True, web_token=True)

    - Sets DISCORD_CLUSTER_MANAGER_API_BASE_URL (auto-reset via monkeypatch)
    - If auth=True: upserts the test user, patches flask-login current user
    - Registers a finalizer to DELETE the test user so the DB is clean after the test
    """

    def _prepare(auth: bool = True, web_token: bool = True):
        # Auto-reset after each test
        monkeypatch.setenv(
            "DISCORD_CLUSTER_MANAGER_API_BASE_URL",
            "http://0.0.0.0:8000",
        )

        if auth:
            web_auth_id = _TEST_WEB_AUTH_ID if web_token else ""
            with app.app_context():
                conn = get_db_connection()
                with conn:  # commit on success, rollback on exception
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO leaderboard.user_info
                                (id, user_name, web_auth_id, cli_id, cli_valid)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (id) DO UPDATE
                            SET web_auth_id = EXCLUDED.web_auth_id,
                                cli_id     = EXCLUDED.cli_id,
                                cli_valid  = EXCLUDED.cli_valid
                            """,
                            (_TEST_USER_ID, "alice", web_auth_id, 777, True),
                        )
            # Patch current user
            fake_user = SimpleNamespace(
                is_anonymous=False,
                get_id=lambda: f"discord:{_TEST_USER_ID}",
            )
            monkeypatch.setattr(flask_login.utils, "_get_user", lambda: fake_user)

            # DB cleanup: remove the test user row after the test
            def _cleanup():
                with app.app_context():
                    conn2 = get_db_connection()
                    _delete_user_graph(conn2, _TEST_USER_ID)
            request.addfinalizer(_cleanup)
        else:
            # Explicit anonymous user
            anon = SimpleNamespace(is_anonymous=True, get_id=lambda: None)
            monkeypatch.setattr(flask_login.utils, "_get_user", lambda: anon)
    return _prepare

# Helper: always attaches a file; allow overrides
def _post_submission(client, form_overrides=None, file_tuple=None):
    fields = {
        "leaderboard_id": "1",
        "leaderboard": "llama",
        "gpu_type": "A100",
        "submission_mode": "test",
    }
    if form_overrides:
        fields.update(form_overrides)

    # (fileobj, filename, mimetype) — Werkzeug order
    file_tuple = file_tuple or (BytesIO(b'print("ok")\n'), "solution.py", "text/x-python")

    return client.post(
        "/api/submission",
        data={**fields, "file": file_tuple},
        # NOTE: Flask/Werkzeug will infer multipart because a file tuple is present.
        # If your stack needs it explicitly, uncomment the next line:
        # content_type="multipart/form-data",
    )


def test_submission_happy_path(app, client, prepare):
    # auth + web_token default to True
    prepare()

    # fake response from external submission API
    submission_response = MagicMock()
    submission_response.status_code = 200
    submission_response.json.return_value = {"message": "queued", "job_id": "j_1"}

    with patch("kernelboard.api.submission.requests.post", return_value=submission_response) as mock_post:
        resp = _post_submission(client)

    assert resp.status_code == http.HTTPStatus.OK
    js = resp.get_json()
    assert js["message"].lower().startswith("submission success")
    assert js["data"]["job_id"] == "j_1"

    # assert external call was correct
    mock_post.assert_called_once()
    called_url = mock_post.call_args.args[0]
    called_headers = mock_post.call_args.kwargs.get("headers")
    assert called_url == "http://0.0.0.0:8000/submission/llama/A100/test"
    # _TEST_WEB_AUTH_ID is "111" per your earlier code/comments
    assert called_headers["X-Web-Auth-Id"] == "111"


def test_submission_unauthorized(app, client, prepare):
    # No auth
    prepare(auth=False)

    resp = _post_submission(client)
    assert resp.status_code == http.HTTPStatus.UNAUTHORIZED
    js = resp.get_json()
    assert js["code"] == 10000 + http.HTTPStatus.UNAUTHORIZED
    assert "log in" in js["message"].lower()


def test_submission_missing_web_token(app, client, prepare):
    # Auth but missing/empty web token
    prepare(web_token=False)

    resp = _post_submission(client)
    assert resp.status_code == http.HTTPStatus.INTERNAL_SERVER_ERROR
    assert "cannot find user info" in resp.get_json()["message"].lower()


def test_submission_validation_error(app, client, prepare):
    prepare()

    base_form = {
        "leaderboard_id": "1",
        "leaderboard": "llama",
        "gpu_type": "A100",
        "submission_mode": "test",
    }

    # Import from your module if available:
    # from kernelboard.api.submission import REQUIRED_SUBMISSION_REQUEST_FIELDS
    REQUIRED_SUBMISSION_REQUEST_FIELDS = ["file", "leaderboard_id", "gpu_type", "submission_mode"]

    for field in REQUIRED_SUBMISSION_REQUEST_FIELDS:
        # copy and drop one field
        form = {**base_form}
        # If the missing field is 'file', send no file
        if field == "file":
            resp = client.post("/api/submission", data=form)
        else:
            form[field] = ""
            resp = _post_submission(client, form_overrides=form)

        assert (
            resp.status_code == http.HTTPStatus.BAD_REQUEST
        ), f"Missing {field} should return 400, but got {resp.status_code}"


def test_submission_file_invalid_file(app, client, prepare):
    # Auth ok
    prepare()

    fields = {
        "leaderboard_id": "1",
        "leaderboard": "llama",
        "gpu_type": "A100",
        "submission_mode": "test",
    }
    # Wrong filename/mime for your validator to reject
    bad_file = (BytesIO(b'print("ok")\n'), "solution.text", "text/x-python")

    resp = client.post("/api/submission", data={**fields, "file": bad_file})
    assert resp.status_code == http.HTTPStatus.BAD_REQUEST
    body = resp.get_json()
    assert body and "invalid" in (body.get("message", "") + body.get("error", "")).lower()


def test_submission_forward_request_exception_returns_502(app, client, prepare):
    prepare()

    with patch("kernelboard.api.submission.requests.post", side_effect=requests.RequestException("boom")):
        resp = _post_submission(client)

    assert resp.status_code == http.HTTPStatus.BAD_GATEWAY  # 502
    body = resp.get_json()
    assert "forward failed" in body["error"].lower()


def test_submission_upstream_non_200_maps_to_http_error(app, client, prepare):
    prepare()

    error_response = MagicMock()
    error_response.status_code = 400
    error_response.reason = "Bad Request"
    error_response.json.return_value = {"detail": "invalid format"}

    with patch("kernelboard.api.submission.requests.post", return_value=error_response) as mock_post:
        resp = _post_submission(client)

    assert resp.status_code == http.HTTPStatus.BAD_REQUEST
    js = resp.get_json()
    assert js["code"] == 10000 + 400
    assert "invalid format" in js["message"].lower()


# ----------------------------
# /api/submissions list tests
# ----------------------------

def test_list_submissions_requires_auth(app, client, prepare, seed_submissions):
    prepare(auth=False)
    resp = client.get("/api/submissions")
    assert resp.status_code == http.HTTPStatus.UNAUTHORIZED

def test_list_submissions_requires_leaderboard_id(app, client, prepare):
    prepare()
    resp = client.get("/api/submissions?limit=10&offset=0")
    assert resp.status_code == http.HTTPStatus.BAD_REQUEST
    assert "leaderboard_id" in resp.get_json()["message"]


def test_list_submissions_clamps_limit_happy_path(client,seed_submissions, prepare):
    prepare()
    r = client.get("/api/submissions?leaderboard_id=339&limit=999&offset=0")
    assert r.status_code == http.HTTPStatus.OK, r.get_data(as_text=True)
    js = r.get_json()

    # Clamp + totals
    assert js["data"]["limit"] == 100
    assert js["data"]["total"] == 2

    # Assuming ORDER BY submission_time DESC (latest first)
    assert js["data"]["items"][0]["submission_id"] == 101
    assert js["data"]["items"][0]["status"] == "running"
    assert js["data"]["items"][1]["submission_id"] == 102
    assert js["data"]["items"][1]["status"] == "pending"


def test_list_submissions_happy_path(client,seed_submissions, prepare):
    prepare()
    r = client.get("/api/submissions?leaderboard_id=339&limit=50&offset=0")
    assert r.status_code == http.HTTPStatus.OK, r.get_data(as_text=True)
    js = r.get_json()

    assert js["data"]["limit"] == 50
    assert js["data"]["total"] == 2

    assert js["data"]["items"][0]["submission_id"] == 101
    assert js["data"]["items"][0]["status"] == "running"
    assert js["data"]["items"][1]["submission_id"] == 102
    assert js["data"]["items"][1]["status"] == "pending"
