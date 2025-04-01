from flask import Blueprint, render_template


blueprint = Blueprint('error', __name__, url_prefix='/')


def page_not_found(e):
    return render_template('404.html'), 404


def server_error(e):
    return render_template('500.html'), 500
