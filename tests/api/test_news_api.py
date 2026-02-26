from http import HTTPStatus
from unittest.mock import mock_open, patch


def test_news(client):
    res = client.get("/api/news")
    assert res.status_code == 200
    json_data = res.get_json()

    assert "data" in json_data
    assert isinstance(json_data["data"], list)
    assert len(json_data["data"]) >= 3


def test_skip_invalid_yaml_with_mock(client):
    fake_file_content = "---\nid: bad\nbroken: [oops\n---\n## content"
    with patch("os.listdir", return_value=["bad.md"]), patch(
        "os.path.exists", return_value=True
    ), patch("builtins.open", mock_open(read_data=fake_file_content)):
        res = client.get("/api/news")
        assert res.status_code == HTTPStatus.NOT_FOUND


def test_only_return_valid_content_with_mock(client):
    fake_files = ["good.md", "bad.md"]
    valid_md = """---
        id: good-news
        title: Good News
        date: 2025-07-10
        category: Valid
        ---
        ## Good content
        This is a **valid** news.
        """
    invalid_md = """---
        id: bad broken: [oops
        ---
        ## content
        """
    m = mock_open()
    m.side_effect = [
        mock_open(read_data=valid_md).return_value,
        mock_open(read_data=invalid_md).return_value,
    ]

    with patch("os.listdir", return_value=fake_files), patch(
        "os.path.exists", return_value=True
    ), patch("builtins.open", m):
        res = client.get("/api/news")
        assert res.status_code == HTTPStatus.OK
        data = res.get_json()
        assert len(data["data"]) == 1
        assert data["data"][0]["id"] == "good-news"
