from unittest.mock import patch, MagicMock
from urllib.parse import parse_qs, urlparse


def test_login(client):
    response = client.get("api/me")
    assert response.status_code == 200


def test_auth_discord(client):
    response = client.get("/api/auth/discord")
    assert response.status_code == 302
    assert "https://discord.com/oauth2/authorize" in response.headers.get(
        "Location"
    )


def test_auth_already_logged_in(client):
    with client.session_transaction() as s:
        s["_user_id"] = "testuser"

    response = client.get("/api/auth/discord")
    assert response.status_code == 302
    assert response.headers.get("Location") == "/v2/"


def test_auth_unknown_provider(client):
    response = client.get("/api/auth/unknown_provider")
    assert response.headers.get("Location") == "/v2/404"


def test_callback_already_logged_in(client):
    with client.session_transaction() as s:
        s["_user_id"] = "testuser"

    response = client.get("/api/auth/discord/callback")
    assert response.status_code == 302
    assert response.headers.get("Location") == "/v2/"


def test_callback_unknown_provider(client):
    response = client.get("/api/auth/unknown_provider/callback")
    location = response.headers.get("Location")
    assert "/v2/login?error=invalid_provider" in location


def test_callback_mismatched_state(client):
    with client.session_transaction() as s:
        s["oauth2_state"] = "123"
    response = client.get("/api/auth/discord/callback?state=456")
    assert_redirect_with_error(response, "invalid_state")


def test_callback_missing_code(client):
    with client.session_transaction() as s:
        s["oauth2_state"] = "123"

    response = client.get(
        "/api/auth/discord/callback?state=123"
    )  # needs code arg

    assert_redirect_with_error(response, "missing_code")


def test_callback_token_request_fails(client):
    with client.session_transaction() as s:
        s["oauth2_state"] = "123"

    mock_response = MagicMock()
    mock_response.status_code = 401

    with patch(
        "kernelboard.api.auth.requests.post", return_value=mock_response
    ) as post:
        response = client.get("/api/auth/discord/callback?state=123&code=456")
        assert_redirect_with_error(response, "token_error")


def test_callback_token_response_does_not_contain_access_token(client):
    with client.session_transaction() as s:
        s["oauth2_state"] = "123"

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "token_type": "Bearer",
        "expires_in": 3600,
        # 'access_token': 'token1',
        "refresh_token": "token2",
        "scope": "identity",
    }
    with patch(
        "kernelboard.api.auth.requests.post", return_value=mock_response
    ):
        response = client.get("/api/auth/discord/callback?state=123&code=456")
        assert_redirect_with_error(response, "token_error")


def test_callback_userinfo_response_fails(client):
    with client.session_transaction() as s:
        s["oauth2_state"] = "123"

    token_response = MagicMock()
    token_response.status_code = 200
    token_response.json.return_value = {
        "token_type": "Bearer",
        "expires_in": 3600,
        "access_token": "token1",
        "refresh_token": "token2",
        "scope": "identity",
    }

    with patch(
        "kernelboard.api.auth.requests.post", return_value=token_response
    ):
        userinfo_response = MagicMock()
        userinfo_response.status_code = 401

        with patch(
            "kernelboard.api.auth.requests.get", return_value=userinfo_response
        ) as get:
            response = client.get(
                "/api/auth/discord/callback?state=123&code=456"
            )
            assert_redirect_with_error(response, "response_error")


def test_callback_happy_path(client):
    with client.session_transaction() as s:
        s["oauth2_state"] = "123"

    token_response = MagicMock()
    token_response.status_code = 200
    token_response.json.return_value = {
        "token_type": "Bearer",
        "expires_in": 3600,
        "access_token": "token1",
        "refresh_token": "token2",
        "scope": "identity",
    }

    with patch(
        "kernelboard.api.auth.requests.post", return_value=token_response
    ):
        userinfo_response = MagicMock()
        userinfo_response.status_code = 200
        userinfo_response.json.return_value = {"id": "789"}

        with patch(
            "kernelboard.api.auth.requests.get", return_value=userinfo_response
        ):
            response = client.get(
                "api/auth/discord/callback?state=123&code=456"
            )
            assert response.status_code == 302
            assert response.headers.get("Location") == "/v2/"


def test_logout(client):
    response = client.get("api/logout")
    assert response.status_code == 200


def assert_redirect_with_error(
    response, expected_error: str, expected_message: str | None = None
):
    """
    Assert that a response redirected to /v2/login with given error and optional message.
    """
    location = response.headers.get("Location")
    assert location, "Response has no Location header"

    parsed = urlparse(location)
    qs = parse_qs(parsed.query)

    # path check
    assert parsed.path == "/v2/login"

    # error code check
    assert qs.get("error") == [expected_error]

    # message check (optional)
    if expected_message is not None:
        assert qs.get("message") == [expected_message]
