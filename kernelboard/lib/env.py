import os
import secrets


def check_env_vars():
    """
    Check that required environment variables are set. If they are not set,
    print a message and exit.

    Core infrastructure vars (DATABASE_URL, REDIS_URL) are always required.
    Other vars are optional for preview/review app deployments.
    """

    # Core infrastructure - always required
    required_env_vars = [
        "DATABASE_URL",
        "REDIS_URL",
    ]

    # Optional for preview deployments - set defaults if not provided
    optional_with_defaults = {
        "SECRET_KEY": secrets.token_hex(32),
        "DISCORD_CLIENT_ID": "preview-disabled",
        "DISCORD_CLIENT_SECRET": "preview-disabled",
        "DISCORD_CLUSTER_MANAGER_API_BASE_URL": "http://localhost:8080",
    }

    for var, default in optional_with_defaults.items():
        if os.getenv(var) is None:
            os.environ[var] = default

    missing_env_vars = [var for var in required_env_vars if os.getenv(var) is None]

    if missing_env_vars:
        print(f"Missing required environment variables: {', '.join(missing_env_vars)}")
        exit(1)
