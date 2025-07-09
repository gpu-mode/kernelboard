from kernelboard.lib.db import get_db_connection


def test_leaderboard(client):
    response = client.get("/leaderboard/339")
    assert response.status_code == 200
    assert b"conv2d" in response.data


def test_nonexistent_leaderboard(client):
    response = client.get("/leaderboard/1000000")
    assert response.status_code == 404


def test_leaderboard_no_submissions(client, app):
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE leaderboard.submission SET leaderboard_id = 340 WHERE leaderboard_id = 339"
            )
            conn.commit()  # Commit update so the web request sees it.

    response = client.get("/leaderboard/339")
    assert response.status_code == 200
    assert b"No submissions yet" in response.data


def test_leaderboard_mathjax(client, app):
    # Test that MathJax script is not included for a standard description.
    response_no_math = client.get("/leaderboard/339")
    assert response_no_math.status_code == 200
    mathjax_script = b'script id="mathjax"'
    assert mathjax_script not in response_no_math.data

    # Test that MathJax script is included when description contains LaTeX.
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Fetch original description.
            cur.execute(
                "SELECT description FROM leaderboard.leaderboard WHERE id = 339"
            )
            result = cur.fetchone()
            description = result[0]

            # Update the description to include a LaTeX expression.
            latex = r"$$\sum_{i=1?^n i$$"
            new_description = f"{latex} {description}"

            cur.execute(
                """
                UPDATE leaderboard.leaderboard
                SET description = %(new_desc)s
                WHERE id = 339
                """,
                {"new_desc": new_description},
            )
            conn.commit()

            response_with_math = client.get("/leaderboard/339")
            assert response_with_math.status_code == 200
            assert mathjax_script in response_with_math.data
            assert latex.encode("utf-8") in response_with_math.data
