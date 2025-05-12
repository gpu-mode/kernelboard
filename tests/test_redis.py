from kernelboard.redis_connection import create_redis_connection

def test_get_and_close_redis_connection(app):
    with app.app_context():
        conn = create_redis_connection()
        assert conn is not None