import psycopg2
from flask import g, Flask, current_app
import logging
logger = logging.getLogger(__name__)
def get_db_connection() -> psycopg2.extensions.connection:
    """
    Get a database connection from the `g` object. If the connection is not
    already in the `g` object, create a new connection using the DATABASE_URL
    from the current app's configuration and store it in the `g` object.
    """
    if "db_connection" not in g:
        database_url = current_app.config["DATABASE_URL"]
        if not database_url:
            raise RuntimeError(
                "DATABASE_URL is not set in the application configuration."
            )
        g.db_connection = psycopg2.connect(database_url)
    return g.db_connection


def close_db_connection(e=None):
    """
    Close the database connection from the `g` object.
    """
    db = g.pop("db_connection", None)
    if db is not None:
        try:
            if e is not None:
                db.rollback()
                logger.error("DB error, rolling back: %s", e)

            else:
                db.commit()
        finally:
            db.close()


def init_app(app: Flask):
    # close the database connection when the application context is destroyed (e.g. at the end of a api request)
    app.teardown_appcontext(close_db_connection)
