from unittest.mock import patch, MagicMock
from kernelboard import db

def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    
    data = response.get_json()
    assert data['service'] == 'kernelboard'
    assert data['status'] == 'healthy'


def test_health_database_error(client):
    # Create a mock cursor that raises an exception when execute is called
    mock_cursor = MagicMock()
    mock_cursor.execute.side_effect = Exception("Database query failed")

    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    with patch('kernelboard.health.get_db_connection', return_value=mock_conn):
        response = client.get('/health')
        assert response.status_code == 500
