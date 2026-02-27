import os

import redis

# Singleton Redis connection
_redis_client: redis.Redis | None = None


def get_redis_connection(
    cert_reqs: str | None = None,
) -> redis.Redis | None:
    """
    Get a singleton Redis connection.
    Reuses the same connection across requests for better performance.
    """
    global _redis_client

    if _redis_client is not None:
        return _redis_client

    url: str | None = os.getenv("REDIS_URL")
    if url is None:
        _redis_client = None
        return None

    kwargs = {}
    if cert_reqs:
        kwargs["ssl_cert_reqs"] = cert_reqs

    _redis_client = redis.from_url(url, **kwargs)
    return _redis_client
