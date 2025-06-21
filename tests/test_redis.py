from kernelboard.redis_connection import get_redis_connection
from kernelboard.redis_connection import get_redis_connection

def test_get_and_close_redis_connection(app):
    with app.app_context():
        conn = get_redis_connection()
        conn = get_redis_connection()
        assert conn is not None
