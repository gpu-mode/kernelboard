from flask import Blueprint, render_template

blueprint = Blueprint('news', __name__, url_prefix='/news')

@blueprint.route('')
def news():
    return render_template('news.html')
