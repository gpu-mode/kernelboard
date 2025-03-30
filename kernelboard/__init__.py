import os
from dotenv import load_dotenv
from flask import Flask
from kernelboard.env import check_env_vars

def create_app(test_config=None):
    # Check if we're in development mode:
    is_dev = os.getenv('FLASK_DEBUG') == '1'
    if is_dev:
        load_dotenv()

    check_env_vars()    

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=os.getenv('SECRET_KEY'),
        DATABASE_URL=os.getenv('DATABASE_URL'),
    )

    if test_config is not None:
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        if not os.path.exists(app.instance_path):
            raise

    @app.route('/health')
    def health():
        return {
            'status': 'healthy',
            'service': 'kernelboard'
        }, 200

    return app
