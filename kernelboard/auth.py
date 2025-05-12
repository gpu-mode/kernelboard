from flask import abort, Blueprint, current_app as app, flash, redirect, \
    render_template, request, session, url_for
from flask_login import current_user, login_user, logout_user, UserMixin
import os
from urllib.parse import urlencode
import requests
import secrets


blueprint = Blueprint('auth', __name__)


def providers():
    """
    Return OAuth2 provider information. 
    """
    return {
        'discord': {
            'client_id': os.getenv('DISCORD_CLIENT_ID'),
            'client_secret': os.getenv('DISCORD_CLIENT_SECRET'),
            'authorize_url': 'https://discord.com/oauth2/authorize',
            'token_url': 'https://discord.com/api/oauth2/token',
            'userinfo': {
                'url': 'https://discord.com/api/users/@me',
                'identity': lambda json: json['id'],
            },
            'scopes': ['identify'],
        }
    }


class User(UserMixin):
    def __init__(self, id):
        self.id = id


@blueprint.route('/login')
def login():
    return render_template('login.html')


@blueprint.route('/auth/<provider>')
def auth(provider):
    if not current_user.is_anonymous:
        return redirect(url_for('index'))

    provider_data = app.config['OAUTH2_PROVIDERS'].get(provider)
    if provider_data is None:
        abort(404)    

    session['oauth2_state'] = secrets.token_urlsafe(16)

    query = urlencode({
        'client_id': provider_data['client_id'],
        'redirect_uri': url_for('auth.callback', provider=provider, _external=True),
        'response_type': 'code',
        'scope': ' '.join(provider_data['scopes']),
        'state': session['oauth2_state'],
    })

    return redirect(provider_data['authorize_url'] + '?' + query)


@blueprint.route('/auth/<provider>/callback')
def callback(provider):
    if not current_user.is_anonymous:
        return redirect(url_for('index'))

    provider_data = app.config['OAUTH2_PROVIDERS'].get(provider)
    if provider_data is None:
        abort(404)

    if 'error' in request.args:
        for k, v in request.args.items():
            if k.startswith('error'):
                flash(f'{k}: {v}')
        return redirect(url_for('index'))

    if request.args['state'] != session.get('oauth2_state'):
        abort(401)

    if 'code' not in request.args:
        abort(401)

    response = requests.post(provider_data['token_url'], data={
        'client_id': provider_data['client_id'],
        'client_secret': provider_data['client_secret'],
        'code': request.args['code'],
        'grant_type': 'authorization_code',
        'redirect_uri': url_for('auth.callback', provider=provider,
                                _external=True),
    }, headers={'Accept': 'application/json'})

    if response.status_code != 200:
        abort(401)

    access_token = response.json().get('access_token')
    if not access_token:
        abort(401)

    response = requests.get(provider_data['userinfo']['url'], headers={
        'Authorization': 'Bearer ' + access_token,
        'Accept': 'application/json',
    })

    if response.status_code != 200:
        abort(401)

    identity = provider_data['userinfo']['identity'](response.json())
    user = User(f'{provider}:{identity}')
    login_user(user)

    return redirect(url_for('index'))


@blueprint.route('/logout')
def logout():
    logout_user()
    session.clear()
    flash("You've been logged out.")
    return redirect(url_for('index'))