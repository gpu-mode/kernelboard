from unittest.mock import patch, MagicMock, PropertyMock


def test_login(client):
    response = client.get('/login')
    assert response.status_code == 200
    assert b'Sign in with Discord' in response.data


def test_auth_discord(client):
    response = client.get('/auth/discord')
    assert response.status_code == 302
    assert 'https://discord.com/oauth2/authorize' in response.headers.get('Location')


def test_auth_already_logged_in(client):
    with client.session_transaction() as s:
        s['_user_id'] = 'testuser'

    response = client.get('/auth/discord')
    assert response.status_code == 302
    assert response.headers.get('Location') == '/'


def test_auth_unknown_provider(client):
    response = client.get('/auth/unknown_provider')
    assert response.status_code == 404


def test_callback_already_logged_in(client):
    with client.session_transaction() as s:
        s['_user_id'] = 'testuser'

    response = client.get('/auth/discord/callback')
    assert response.status_code == 302
    assert response.headers.get('Location') == '/'


def test_callback_unknown_provider(client):
    response = client.get('/auth/unknown_provider/callback')
    assert response.status_code == 404


def test_callback_error(client):
    response = client.get('/auth/discord/callback?error=some_error_value')
    assert response.status_code == 302
    assert response.headers.get('Location') == '/'


def test_callback_mismatched_state(client):
    with client.session_transaction() as s:
        s['oauth2_state'] = '123'

    response = client.get('/auth/discord/callback?state=456')
    assert response.status_code == 401


def test_callback_missing_code(client):
    with client.session_transaction() as s:
        s['oauth2_state'] = '123'

    response = client.get('/auth/discord/callback?state=123') # needs code arg
    assert response.status_code == 401


def test_callback_token_request_fails(client):
    with client.session_transaction() as s:
        s['oauth2_state'] = '123'

    mock_response = MagicMock()
    mock_response.status_code = 401

    with patch('kernelboard.auth.requests.post', return_value=mock_response) as post:
        response = client.get('/auth/discord/callback?state=123&code=456')
        assert response.status_code == 401
        post.assert_called_once()


def test_callback_token_response_does_not_contain_access_token(client):
    with client.session_transaction() as s:
        s['oauth2_state'] = '123'

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'token_type': 'Bearer',
        'expires_in': 3600,
        # 'access_token': 'token1',
        'refresh_token': 'token2',
        'scope': 'identity',
    }

    with patch('kernelboard.auth.requests.post', return_value=mock_response):
        response = client.get('/auth/discord/callback?state=123&code=456')
        assert response.status_code == 401
        mock_response.json.assert_called_once()


def test_callback_userinfo_response_fails(client):
    with client.session_transaction() as s:
        s['oauth2_state'] = '123'

    token_response = MagicMock()
    token_response.status_code = 200
    token_response.json.return_value = {
        'token_type': 'Bearer',
        'expires_in': 3600,
        'access_token': 'token1',
        'refresh_token': 'token2',
        'scope': 'identity',
    }

    with patch('kernelboard.auth.requests.post', return_value=token_response):
        userinfo_response = MagicMock()
        userinfo_response.status_code = 401

        with patch('kernelboard.auth.requests.get', return_value=userinfo_response) as get:
            response = client.get('/auth/discord/callback?state=123&code=456')
            assert response.status_code == 401
            get.assert_called_once()


def test_callback_happy_path(client):
    with client.session_transaction() as s:
        s['oauth2_state'] = '123'

    token_response = MagicMock()
    token_response.status_code = 200
    token_response.json.return_value = {
        'token_type': 'Bearer',
        'expires_in': 3600,
        'access_token': 'token1',
        'refresh_token': 'token2',
        'scope': 'identity',
    }

    with patch('kernelboard.auth.requests.post', return_value=token_response):
        userinfo_response = MagicMock()
        userinfo_response.status_code = 200
        userinfo_response.json.return_value = {
            'id': '789'
        }

        with patch('kernelboard.auth.requests.get', return_value=userinfo_response):
            response = client.get('/auth/discord/callback?state=123&code=456')
            assert response.status_code == 302
            assert response.headers.get('Location') == '/'


def test_logout(client):
    response = client.get('/logout')
    assert response.status_code == 302
    assert response.headers.get('Location') == '/'
