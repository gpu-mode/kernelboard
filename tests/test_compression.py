import gzip

from flask import jsonify


def test_json_responses_are_compressed_without_changing_content(app, client):
    payload = {"text": "kernelboard " * 500}
    app.add_url_rule("/compression-test", view_func=lambda: jsonify(payload))

    original = client.get("/compression-test")
    compressed = client.get("/compression-test", headers={"Accept-Encoding": "gzip"})

    assert compressed.status_code == 200
    assert compressed.headers["Content-Encoding"] == "gzip"
    assert "Accept-Encoding" in compressed.headers["Vary"]
    assert gzip.decompress(compressed.data) == original.data
    assert len(compressed.data) < len(original.data) / 5


def test_static_scripts_are_compressed_and_ranges_are_preserved(app, client, tmp_path):
    assets = tmp_path / "app" / "assets"
    assets.mkdir(parents=True)
    script = b"console.log('kernelboard');\n" * 500
    (assets / "test.js").write_bytes(script)
    app.static_folder = str(tmp_path)

    compressed = client.get("/assets/test.js", headers={"Accept-Encoding": "gzip"})
    assert compressed.headers["Content-Encoding"] == "gzip"
    assert gzip.decompress(compressed.data) == script

    partial = client.get(
        "/assets/test.js",
        headers={"Accept-Encoding": "gzip", "Range": "bytes=0-9"},
    )
    assert partial.status_code == 206
    assert "Content-Encoding" not in partial.headers
    assert partial.data == script[:10]
