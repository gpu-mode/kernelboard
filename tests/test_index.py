import re

from bs4 import BeautifulSoup


def test_index(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"GPU MODE" in response.data


def test_leaderboard_order(client):
    """
    Test that the leaderboard IDs are in decreasing order.
    """

    response = client.get("/")
    assert response.status_code == 200

    soup = BeautifulSoup(response.data, "html.parser")
    links = soup.find_all("a", href=re.compile(r"/leaderboard/\d+"))

    # Extract leaderboard IDs from the link's href attribute.
    ids = []
    for link in links:
        href = link.get("href")
        match = re.search(r"/leaderboard/(\d+)", href)
        if match:
            ids.append(int(match.group(1)))

    # Check that we have enough data for a meaningful test.
    assert len(ids) > 2

    # Verify that the extracted IDs are in decreasing order
    assert all(
        ids[i] > ids[i + 1] for i in range(len(ids) - 1)
    ), f"Leaderboard IDs are not in decreasing order: {ids}"
