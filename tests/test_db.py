import psycopg2
import pytest

from kernelboard.lib.db import get_db_connection


def test_get_and_close_db_connection(app):
    with app.app_context():
        conn = get_db_connection()
        assert conn is not None
        assert not conn.closed
        assert conn is get_db_connection()
        conn.cursor().execute("SELECT 1")

    assert conn.closed

    with pytest.raises(psycopg2.InterfaceError) as e:
        conn.cursor().execute("SELECT 1")

    assert "connection already closed" in str(e.value)
