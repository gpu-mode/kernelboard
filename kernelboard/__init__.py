import os
from flask import Flask, jsonify, send_from_directory, render_template
from flask_session import Session
from flask_login import LoginManager
from flask_talisman import Talisman

def create_app(test_config=None):
    app = Flask(__name__,
                static_folder="static",
                template_folder="templates")

    app.config.from_mapping(
        SECRET_KEY=os.getenv('SECRET_KEY', 'dev'),
        SESSION_TYPE='filesystem',  # 简化本地测试
        SESSION_PERMANENT=False,
    )

    if test_config is not None:
        app.config.update(test_config)

    Session(app)
    login_manager = LoginManager()
    login_manager.init_app(app)

    Talisman(app, force_https=False)  # 本地调试 HTTPS 不强制

    @app.route('/')
    def index():
        return render_template('index.html')
    """
        @app.route('/api/hello')
        def hello():
            return jsonify({'message': 'Hello from Flask API!'})

        @app.route('/app', defaults={"path": ""})
        @app.route('/app/<path:path>')
        def serve_react(path):
            react_dir = os.path.join(app.static_folder, "app")
            file_path = os.path.join(react_dir, path)
            if path and os.path.exists(file_path):
                return send_from_directory(react_dir, path)
            else:
                return send_from_directory(react_dir, "index.html")
    """
    return app
