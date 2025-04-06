from kernelboard.db import get_db_connection

def test_leaderboard(client):
    response = client.get('/leaderboard/339')
    assert response.status_code == 200
    assert b'conv2d' in response.data

def test_leaderboard_mathjax(client, app):
    # Test that MathJax script is not included for a standard description.
    response_no_math = client.get('/leaderboard/339')
    assert response_no_math.status_code == 200
    mathjax_script = b'script id="mathjax"'
    assert mathjax_script not in response_no_math.data

    # Test that MathJax script is included when description contains LaTeX.
    with app.app_context():
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Fetch original description.
            cur.execute("SELECT task->>'description' FROM leaderboard.leaderboard WHERE id = 339")
            result = cur.fetchone()
            description = result[0]

            # Update the description to include a LaTeX expression.
            latex = r"$$\sum_{i=1?^n i$$"
            new_description = f"{latex} {description}" 

            cur.execute(
                """
                UPDATE leaderboard.leaderboard
                SET task = jsonb_set(task, '{description}', to_jsonb(%(new_desc)s::text))
                WHERE id = 339
                """,
                {'new_desc': new_description}
            )
            conn.commit()  # Commit update so the web request sees it.

            response_with_math = client.get('/leaderboard/339')
            assert response_with_math.status_code == 200
            assert mathjax_script in response_with_math.data
            assert latex.encode('utf-8') in response_with_math.data
