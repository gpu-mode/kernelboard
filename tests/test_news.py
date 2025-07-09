def test_index(client):
    response = client.get("/news")
    assert response.status_code == 200
    assert b"<h1>News and Announcements</h1>" in response.data
