import os
from flask_limiter import Limiter
from flask_login import current_user
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
import logging

logger = logging.getLogger(__name__)


def limiter_storage_uri(url: str | None, cert_reqs: str = "none") -> str:
    if not url:
        logger.warning("No REDIS_URL for limiter; falling back to memory://")
        raise ValueError("No REDIS_URL for limiter")

    p = urlparse(url)
    qs = dict(parse_qsl(p.query, keep_blank_values=True))

    if p.scheme == "rediss":
        qs.setdefault("ssl_cert_reqs", cert_reqs)

    return urlunparse(p._replace(query=urlencode(qs)))


# this only limits the number of requests per user, not per IP address
limiter = Limiter(
    key_func=lambda: f"user:{current_user.get_id()}",
    storage_uri=limiter_storage_uri(os.environ.get("REDIS_URL", "")),
    strategy="moving-window",
    headers_enabled=True,
    default_limits=[],
)
