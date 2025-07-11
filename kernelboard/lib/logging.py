import logging


def configure_logging(app):
    if app.logger.hasHandlers():
        app.logger.handlers.clear()

    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
    )
    handler.setFormatter(formatter)

    # add handler to app.logger
    app.logger.setLevel(logging.INFO)
    app.logger.addHandler(handler)

    # set root logger
    logging.basicConfig(level=logging.INFO, handlers=[handler])
