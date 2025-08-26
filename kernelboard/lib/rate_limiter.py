import os
from flask_limiter import Limiter
from flask_login import current_user

# this only limits the number of requests per user, not per IP address
limiter = Limiter(
    key_func=lambda: f"user:{current_user.get_id()}",
    storage_uri=os.environ.get("REDIS_URL"),
    strategy="moving-window",
    headers_enabled=True,
    default_limits=[], # no default limits, we'll set them in the routes
)
