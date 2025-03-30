def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    
    data = response.get_json()
    assert data['service'] == 'kernelboard'
    assert data['status'] == 'healthy'
