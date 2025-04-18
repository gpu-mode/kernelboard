import psycopg2
import pytest
import random
import secrets
import string
import subprocess
import time
from kernelboard import create_app
from kernelboard.env import check_env_vars


def _short_random_string() -> str:
    """Returns a random string of 6 lowercase letters."""
    return ''.join(random.choice(string.ascii_lowercase) for i in range(6))


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
def template_db():
    """Creates a template database once per session."""

    container_name = f"kernelboard_{_short_random_string()}"
    port = 5433
    password = 'test'
    db_url = f"postgresql://postgres:{password}@localhost:{port}"

    docker_run_cmd = [
        "docker", "run", "-d",
        f"--name={container_name}",
        f"-e", f"POSTGRES_PASSWORD={password}",
        f"-p", f"{port}:5432",
        "--tmpfs", "/var/lib/postgresql/data",
        "postgres:16"
    ]

    try:
        print(f"Attempting to start database container {container_name}...")
        subprocess.run(docker_run_cmd, check=True, capture_output=True)
        print(f"Database container started.")

        print(f"Waiting for database container to be ready...")
        attempts = 0
        max_attempts = 30
        ready = False
        while attempts < max_attempts:
            time.sleep(1)
            try:
                docker_exec_cmd = [
                    "docker", "exec", container_name,
                    "pg_isready", "-U", "postgres"
                ]
                result = subprocess.run(docker_exec_cmd, check=True, capture_output=True, text=True)
                if "accepting connections" in result.stdout:
                    print(f"Database container is ready.")
                    ready = True
                    break
            except subprocess.CalledProcessError as e:
                print(f"Attempt {attempts + 1}/{max_attempts}: Database container not ready yet: {e.stderr}")
            attempts += 1

        if not ready:
            raise TimeoutError(f"Database container did not become ready within {max_attempts} attempts.")

        db_name = f"kernelboard_template_{_short_random_string()}"
        _execute_sql(db_url, f"CREATE DATABASE {db_name}")

        # Load data.sql into the template database:
        result = subprocess.run([
            'psql',
            '-h', 'localhost',
            '-U', 'postgres',
            '-p', f"{port}",
            '-d', db_name,
            '-f', 'tests/data.sql'
        ], env={'PGPASSWORD': password})

        if result.returncode != 0:
            pytest.exit("Error loading data.sql", returncode=1)

        # Yield the template database URL and name so that the tests can use it:
        yield {'db_url': db_url, 'db_name': db_name}

    finally:
        print(f"Stopping database container...")
        try:
            subprocess.run(["docker", "stop", container_name], check=True, capture_output=True)
            print(f"Database container stopped.")
        except subprocess.CalledProcessError as e:
            print(f"Could not stop database container. Error: {e.stderr}")

        print(f"Removing database container...")
        try:
            subprocess.run(["docker", "rm", container_name], check=True, capture_output=True)
            print(f"Container removed.")
        except subprocess.CalledProcessError as e:
            print(f"Could not remove database container. Error: {e.stderr}")


@pytest.fixture
def app(template_db: dict):
    """
    Creates a new test-specific DB for each test, configures the Flask app,
    and cleans up.
    """

    db_url = template_db['db_url']
    template_db = template_db['db_name']
    test_db = f"kernelboard_test_{_short_random_string()}"

    _execute_sql(db_url, f"CREATE DATABASE {test_db} TEMPLATE {template_db}")

    app = create_app({
        'TESTING': True,
        'SECRET_KEY': secrets.token_hex(),
        'DATABASE_URL': f"{db_url}/{test_db}",
        'TALISMAN_FORCE_HTTPS': False,
    })

    yield app

    _execute_sql(db_url, f"DROP DATABASE {test_db}")


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()
