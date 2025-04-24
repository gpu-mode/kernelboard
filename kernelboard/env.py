import os

def check_env_vars():
    """
    Check that required environment variables are set. If they are not set,
    print a message and exit.
    """

    required_env_vars = ['SECRET_KEY', 'DATABASE_URL']
    missing_env_vars = [var for var in required_env_vars if os.getenv(var) is None]

    if missing_env_vars:
        print(f"Missing required environment variables: {', '.join(missing_env_vars)}")
        exit(1)
