from unittest.mock import patch, MagicMock
import redis


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data["data"]["service"] == "kernelboard"
    assert data["data"]["status"] == "healthy"


def assert_unhealthy(response):
    assert response.status_code == 500
    json_data = response.get_json()
    assert json_data["data"]["status"] == "unhealthy"
    assert json_data["data"]["service"] == "kernelboard"


def test_health_database_error(client):
    mock_cursor = MagicMock()
    mock_cursor.execute.side_effect = Exception("Database query failed")
    # Configure the __enter__ method to return the mock cursor itself.
    # Needed because the context manager will invoke __enter__.
    mock_cursor.__enter__.return_value = mock_cursor

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    with patch("kernelboard.health.get_db_connection", return_value=mock_conn):
        assert_unhealthy(client.get("/health"))
        mock_cursor.execute.assert_called_once()


def test_health_no_redis_config(client):
    with patch("kernelboard.health.create_redis_connection", return_value=None):
        assert_unhealthy(client.get("/health"))


def test_health_redis_error(client):
    mock_conn = MagicMock()
    mock_conn.ping.side_effect = redis.exceptions.ConnectionError(
        "Redis connection failed"
    )

    with patch("kernelboard.health.create_redis_connection", return_value=mock_conn):
        assert_unhealthy(client.get("/health"))
        mock_conn.ping.assert_called_once()
