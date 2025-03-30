import os
import pytest
from kernelboard import create_app
from kernelboard.env import check_env_vars
from dotenv import load_dotenv


load_dotenv()


@pytest.fixture
def app():
    check_env_vars()

    app = create_app({
        'TESTING': True,
        'SECRET_KEY': os.getenv('SECRET_KEY'),
        'DATABASE_URL': os.getenv('DATABASE_URL'),
    })

    yield app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()
