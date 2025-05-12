from flask import current_app as app
import redis


def create_redis_connection() -> redis.Redis | None:
    """
    Creates a redis connection using application configuration.
    """
    if 'REDIS_URL' not in app.config:
        return None

    url = app.config['REDIS_URL']
    
    kwargs = {}
    if 'REDIS_SSL_CERT_REQS' in app.config:
        kwargs['ssl_cert_reqs'] = app.config['REDIS_SSL_CERT_REQS']
    
    return redis.from_url(url, **kwargs)
