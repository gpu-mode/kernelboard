import psycopg2
from kernelboard import create_app
import pytest
import random
import string
import subprocess
import time
import secrets
import os


def get_test_redis_url(port: int):
    return f"redis://localhost:{port}/0"


def get_test_redis_port() -> int:
    return 6380


def get_test_db_info():
    port = 5433
    password = "test"
    db_url = f"postgresql://postgres:{password}@localhost:{port}"

    return {
        "port": port,
        "password": password,
        "db_url": db_url,
    }


def is_ci_environment():
    """Check if we're running in a CI environment where Docker may not be available."""
    return os.environ.get("CI") == "true" or os.environ.get("GITHUB_ACTIONS") == "true"


def _short_random_string() -> str:
    """Returns a random string of 6 lowercase letters."""
    return "".join(random.choice(string.ascii_lowercase) for i in range(6))


def _execute_sql(url: str, sql: str):
    """
    Executes a SQL statement on a database.

    Args:
        url: The URL of the database.
        sql: The SQL statement to execute.
    """
    conn = psycopg2.connect(url)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(sql)


@pytest.fixture(scope="session")
def db_server():
    """Starts a DB server and creates a template DB once per session."""
    
    # In CI environments, use the service containers provided by GitHub Actions
    if is_ci_environment():
        # GitHub Actions provides PostgreSQL service container
        db_url = "postgresql://postgres:test@localhost:5432"
        
        # Create a template database and load data
        template_db = f"kernelboard_template_{_short_random_string()}"
        _execute_sql(db_url, f"CREATE DATABASE {template_db}")
        
        # Load data.sql into the template database using psql
        result = subprocess.run(
            [
                "psql",
                "-h",
                "localhost",
                "-U",
                "postgres",
                "-p",
                "5432",
                "-d",
                template_db,
                "-f",
                "tests/data.sql",
            ],
            env={"PGPASSWORD": "test"},
        )
        
        if result.returncode != 0:
            pytest.exit("Error loading data.sql in CI", returncode=1)
        
        yield {"db_url": db_url, "db_name": template_db}
        
        # Cleanup: drop the template database
        _execute_sql(db_url, f"DROP DATABASE {template_db}")
        return

    # Original Docker-based logic for local development
    container_name = f"kernelboard_db_{_short_random_string()}"

    test_db = get_test_db_info()

    port = test_db["port"]
    password = test_db["password"]
    db_url = test_db["db_url"]

    docker_run_cmd = [
        "docker",
        "run",
        "-d",
        f"--name={container_name}",
        "-e",
        f"POSTGRES_PASSWORD={password}",
        "-p",
        f"{port}:5432",
        "--tmpfs",
        "/var/lib/postgresql/data",
        "postgres:16",
    ]

    try:
        print(f"Attempting to start database container {container_name}...")
        subprocess.run(docker_run_cmd, check=True, capture_output=True)
        print("Database container started.")

        print("Waiting for database container to be ready...")
        attempts = 0
        max_attempts = 30
        ready = False
        while attempts < max_attempts:
            time.sleep(1)
            try:
                docker_exec_cmd = [
                    "docker",
                    "exec",
                    container_name,
                    "pg_isready",
                    "-U",
                    "postgres",
                ]
                result = subprocess.run(
                    docker_exec_cmd, check=True, capture_output=True, text=True
                )
                if "accepting connections" in result.stdout:
                    print("Database container is ready.")
                    ready = True
                    break
            except subprocess.CalledProcessError as e:
                print(
                    f"Attempt {attempts + 1}/{max_attempts}: Database container not ready yet: {e.stderr}"
                )
            attempts += 1

        if not ready:
            raise TimeoutError(
                f"Database container did not become ready within {max_attempts} attempts."
            )

        db_name = f"kernelboard_template_{_short_random_string()}"
        _execute_sql(db_url, f"CREATE DATABASE {db_name}")

        # Load data.sql into the template database:
        result = subprocess.run(
            [
                "psql",
                "-h",
                "localhost",
                "-U",
                "postgres",
                "-p",
                f"{port}",
                "-d",
                db_name,
                "-f",
                "tests/data.sql",
            ],
            env={"PGPASSWORD": password},
        )

        if result.returncode != 0:
            pytest.exit("Error loading data.sql", returncode=1)

        # Yield the template database URL and name so that the tests can use it:
        yield {"db_url": db_url, "db_name": db_name}

    finally:
        print("Stopping database container...")
        try:
            subprocess.run(
                ["docker", "stop", container_name],
                check=True,
                capture_output=True,
            )
            print("Database container stopped.")
        except subprocess.CalledProcessError as e:
            print(f"Could not stop database container. Error: {e.stderr}")

        print("Removing database container...")
        try:
            subprocess.run(
                ["docker", "rm", container_name],
                check=True,
                capture_output=True,
            )
            print("Container removed.")
        except subprocess.CalledProcessError as e:
            print(f"Could not remove database container. Error: {e.stderr}")


@pytest.fixture(scope="session")
def redis_server():
    """
    Starts a Redis Docker container for the test session.
    In CI environments, uses the service container provided by GitHub Actions.
    """
    
    # In CI environments, use the service containers provided by GitHub Actions
    if is_ci_environment():
        yield "redis://localhost:6379/0"
        return
    
    container_name = f"kernelboard_redis_{_short_random_string()}"
    port = get_test_redis_port()
    redis_url = get_test_redis_url(port)

    docker_run_cmd = [
        "docker",
        "run",
        "-d",
        f"--name={container_name}",
        "-p",
        f"{port}:6379",
        "--tmpfs",
        "/data",
        "redis:7-alpine",
        "redis-server",
        "--save",
        '""',
        "--appendonly",
        "no",
    ]

    try:
        print(f"Attempting to start Redis container {container_name}...")
        subprocess.run(docker_run_cmd, check=True, capture_output=True)
        print("Redis container started.")

        print("Waiting for Redis container to be ready...")
        attempts = 0
        max_attempts = 30
        ready = False
        while attempts < max_attempts:
            time.sleep(1)
            try:
                docker_exec_cmd = [
                    "docker",
                    "exec",
                    container_name,
                    "redis-cli",
                    "ping",
                ]
                result = subprocess.run(
                    docker_exec_cmd, check=True, capture_output=True, text=True
                )
                if "PONG" in result.stdout:
                    print("Redis container is ready.")
                    ready = True
                    break
            except subprocess.CalledProcessError as e:
                print(
                    f"Attempt {attempts + 1}/{max_attempts}: Redis container not ready yet: {e.stderr.strip()}"
                )
            attempts += 1

        if not ready:
            logs_cmd = ["docker", "logs", container_name]
            logs_result = subprocess.run(
                logs_cmd, capture_output=True, text=True
            )
            print(
                f"Container logs:\n{logs_result.stdout}\n{logs_result.stderr}"
            )
            raise TimeoutError(
                f"Redis container did not become ready within {max_attempts} attempts."
            )

        yield redis_url

    finally:
        print(f"Stopping Redis container {container_name}...")
        try:
            subprocess.run(
                ["docker", "stop", container_name],
                check=True,
                capture_output=True,
            )
            print("Redis container stopped.")
        except subprocess.CalledProcessError as e:
            print(
                f"Could not stop Redis container {container_name}. Error: {e.stderr}"
            )

        print(f"Removing Redis container {container_name}...")
        try:
            subprocess.run(
                ["docker", "rm", container_name],
                check=True,
                capture_output=True,
            )
            print("Redis container removed.")
        except subprocess.CalledProcessError as e:
            print(
                f"Could not remove Redis container {container_name}. Error: {e.stderr}"
            )


@pytest.fixture
def app(db_server: dict, redis_server: str):
    """
    Creates a new test-specific DB for each test, configures the Flask app
    with DB and Redis URLs, and cleans up.
    """

    db_url = db_server["db_url"]
    template_db = db_server["db_name"]
    test_db = f"kernelboard_test_{_short_random_string()}"

    _execute_sql(db_url, f"CREATE DATABASE {test_db} TEMPLATE {template_db}")

    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": secrets.token_hex(),
            "DATABASE_URL": f"{db_url}/{test_db}",
            "REDIS_URL": redis_server,
            "TALISMAN_FORCE_HTTPS": False,
        }
    )

    yield app

    _execute_sql(db_url, f"DROP DATABASE {test_db}")


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()

@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    # In CI environments, rely on environment variables set by GitHub Actions
    if is_ci_environment():
        # Don't override environment variables in CI mode - use what's already set
        return
    
    # For local development, set the traditional test environment variables
    monkeypatch.setenv("DATABASE_URL", get_test_db_info()["db_url"])
    monkeypatch.setenv("DISCORD_CLIENT_ID", "test")
    monkeypatch.setenv("DISCORD_CLIENT_SECRET", "test")
    monkeypatch.setenv("REDIS_URL", get_test_redis_url(get_test_redis_port()))
    monkeypatch.setenv("SECRET_KEY", "test-secret")
    monkeypatch.setenv("DISCORD_CLUSTER_MANAGER_API_BASE_URL", "test-secret")
