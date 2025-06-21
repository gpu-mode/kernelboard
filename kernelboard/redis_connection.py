import os
import redis

import os
import redis

_redis_client = None

def get_redis_connection(cert_reqs: str | None = None) -> redis.Redis | None:
    def get_redis_connection(cert_reqs: str | None = None) -> redis.Redis | None:
    """
    Retrieves or initializes a singleton redis connection.
    Retrieves or initializes a singleton redis connection.
    """
    global _redis_client
    if _redis_client is None:
        url = os.getenv('REDIS_URL')
        if url is None:
            return None
    global _redis_client
    if _redis_client is None:
        url = os.getenv('REDIS_URL')
        if url is None:
            return None

    kwargs = {}
    if cert_reqs:
        kwargs['ssl_cert_reqs'] = cert_reqs

    return redis.from_url(url, **kwargs)
