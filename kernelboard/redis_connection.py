import os
import redis
_redis_client = None
def get_redis_connection(cert_reqs: str | None = None) -> redis.Redis | None:
    """
    Retrieves or initializes a singleton redis connection.
    """
    global _redis_client
    if _redis_client is None:
        url = os.getenv('REDIS_URL')
        if url is None:
            return None
