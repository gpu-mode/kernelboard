import os
from dotenv import load_dotenv
from flask import Flask
from flask_talisman import Talisman
from . import color, db, env, error, health, index, leaderboard, news, score, time

def create_app(test_config=None):
    # Check if we're in development mode:
    is_dev = os.getenv('FLASK_DEBUG') == '1'
    if is_dev:
        load_dotenv()

    env.check_env_vars()

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=os.getenv('SECRET_KEY'),
        DATABASE_URL=os.getenv('DATABASE_URL'),
        TALISMAN_FORCE_HTTPS=True,
    )

    if test_config is not None:
        app.config.from_mapping(test_config)

    Talisman(
        app,
        content_security_policy={
            'default-src': "'self'",
            'script-src': "'self' https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
        },
        force_https=app.config.get('TALISMAN_FORCE_HTTPS', True))

    try:
        os.makedirs(app.instance_path)
    except OSError:
        if not os.path.exists(app.instance_path):
            raise

    db.init_app(app)

    app.add_template_filter(color.to_color, 'to_color')
    app.add_template_filter(index.select_highest_priority_gpu, 'select_highest_priority_gpu')
    app.add_template_filter(score.format_score, 'format_score')
    app.add_template_filter(time.to_time_left, 'to_time_left')
    app.add_template_filter(time.format_datetime, 'format_datetime')

    app.register_blueprint(health.blueprint)
    app.add_url_rule('/health', endpoint='health')

    app.register_blueprint(index.blueprint)
    app.add_url_rule('/', endpoint='index')

    app.register_blueprint(leaderboard.blueprint)
    app.add_url_rule('/leaderboard/<int:id>', endpoint='leaderboard')

    app.register_blueprint(news.blueprint)
    app.add_url_rule('/news', endpoint='news')

    app.errorhandler(404)(error.page_not_found)
    app.errorhandler(500)(error.server_error)

    return app
