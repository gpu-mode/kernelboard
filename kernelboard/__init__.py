import http
import os
from re import L
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, session, g
from flask_login import LoginManager, current_user
from flask_session import Session
from flask_talisman import Talisman
from kernelboard.api.auth import User, providers
from kernelboard.lib import db, env, time, score
from kernelboard import color, error, health, index, leaderboard, news
from kernelboard.api import create_api_blueprint
from kernelboard.lib.redis_connection import create_redis_connection
from flask import send_from_directory
from kernelboard.lib.logging import configure_logging
from flask_limiter import Limiter
from kernelboard.lib.rate_limiter import limiter
from kernelboard.lib.status_code import http_error

def create_app(test_config=None):
    # Check if we're in development mode:
    is_dev = os.getenv("FLASK_DEBUG") == "1"
    if is_dev:
        load_dotenv()

    env.check_env_vars()

    app = Flask(__name__, instance_relative_config=True)

    # set logging for flask app
    configure_logging(app)

    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY"),
        DATABASE_URL=os.getenv("DATABASE_URL"),
        REDIS_URL=os.getenv("REDIS_URL"),
        TALISMAN_FORCE_HTTPS=not is_dev,
        SESSION_COOKIE_SECURE=not is_dev,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_PERMANENT=True,
        PERMANENT_SESSION_LIFETIME=1209600,  # 14 days
        SESSION_TYPE="redis",
        # Heroku Redis uses self-signed certificates:
        # https://devcenter.heroku.com/articles/heroku-redis#security-and-compliance
        # In Heroku we use the config key REDIS_SSL_CERT_REQS to have redis-py
        # accept self-signed certificates.
        SESSION_REDIS=create_redis_connection(
            cert_reqs=os.getenv("REDIS_SSL_CERT_REQS")
        ),
        OAUTH2_PROVIDERS=providers(),
        # Rate limiting
        RATELIMIT_SWALLOW_ERRORS=True,
    )

    if test_config is not None:
        app.config.from_mapping(test_config)

    Session(app)

    login_manager = LoginManager()


    @login_manager.user_loader
    def load_user(user_id):
        return User(user_id) if user_id else None


    @login_manager.unauthorized_handler
    def unauthorized():
        return http_error(
            message="Unauthorized",
            status_code=http.HTTPStatus.UNAUTHORIZED,
        )


    login_manager.init_app(app)

    csp = {
        "default-src": ["'self'"],
        "script-src": "'self' https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
        "style-src": ["'self'", "'unsafe-inline'"],  # new ui needs inline styles ,
        "img-src": "'self' data: blob: https://cdn.jsdelivr.net https://*.jsdelivr.net https://cdn.discordapp.com https://media.discordapp.net",
        "font-src": ["'self'"],
    }

    Talisman(
        app,
        content_security_policy=csp,
        force_https=app.config.get("TALISMAN_FORCE_HTTPS", True),
    )

    try:
        os.makedirs(app.instance_path)
    except OSError:
        if not os.path.exists(app.instance_path):
            raise

    db.init_app(app)


    # Initialize rate limiter
    limiter.init_app(app)

    app.add_template_filter(color.to_color, "to_color")
    app.add_template_filter(score.format_score, "format_score")
    app.add_template_filter(time.to_time_left, "to_time_left")
    app.add_template_filter(time.format_datetime, "format_datetime")

    app.register_blueprint(health.blueprint)
    app.add_url_rule("/health", endpoint="health")
    
    # Register the main blueprints for backward compatibility and testing
    app.register_blueprint(index.blueprint)
    app.register_blueprint(leaderboard.blueprint)
    app.register_blueprint(news.blueprint)

    if not app.blueprints.get("api"):
        api = create_api_blueprint()
        app.register_blueprint(api)

    @app.errorhandler(401)
    def unauthorized(_error):
        return redirect("/v2/401")

    @app.errorhandler(404)
    def not_found(_error):
        # Only redirect to React frontend for v2 routes or unhandled routes
        # Let backend routes (like /leaderboard/123) return proper 404s
        from flask import request
        if request.path.startswith('/v2/') or request.path == '/':
            return redirect("/v2/404")
        else:
            # Let the backend route handle the 404 properly
            return _error

    @app.errorhandler(500)
    def server_error(_error):
        return redirect("/v2/500")

    # Route for serving React frontend from the /v2/ path
    # # This handles both the base path `/v2/` and any subpath `/v2/<path>`
    @app.route("/v2/", defaults={"path": ""})
    @app.route("/v2/<path:path>")
    def serve_react(path):
        # set the react static binary path
        static_dir = os.path.join(app.static_folder, "v2")
        full_path = os.path.join(static_dir, path)

        if path != "" and os.path.exists(full_path):
            return send_from_directory(static_dir, path)
        else:
            return send_from_directory(static_dir, "index.html")

    return app
