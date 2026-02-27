import os

import redis

# Singleton Redis connection
_redis_client: redis.Redis | None = None
_redis_initialized: bool = False


def get_redis_connection(
    cert_reqs: str | None = None,
) -> redis.Redis | None:
    """
    Get a singleton Redis connection.
    Reuses the same connection across requests for better performance.
    """
    global _redis_client, _redis_initialized

    # Return cached connection if already initialized
    if _redis_initialized:
        return _redis_client

    url: str | None = os.getenv("REDIS_URL")
    if url is None:
        _redis_initialized = True
        _redis_client = None
        return None

    kwargs = {}
    if cert_reqs:
        kwargs["ssl_cert_reqs"] = cert_reqs

    _redis_client = redis.from_url(url, **kwargs)
    _redis_initialized = True
    return _redis_client
