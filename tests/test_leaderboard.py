def test_leaderboard(client):
    # This test assumes that leaderboard/339 is the conv2d leaderboard. We
    # should setup a test database with this problem and some submissions for
    # it, and use that test database to test the leaderboard.
    response = client.get('/leaderboard/339')
    assert response.status_code == 200
    assert b'conv2d' in response.data
