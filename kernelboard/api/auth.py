from __future__ import annotations

import os
import secrets
from urllib.parse import urlencode

import requests
from flask import (
    Blueprint,
    abort,
    current_app as app,
    jsonify,
    redirect,
    request,
    session,
    url_for,
)
from flask_login import UserMixin, current_user, login_user, logout_user
from kernelboard.lib.status_code import http_success

auth_bp = Blueprint("auth", __name__)



def providers():
    """
    Return OAuth2 provider information.
    """
    return {
        "discord": {
            "client_id": os.getenv("DISCORD_CLIENT_ID"),
            "client_secret": os.getenv("DISCORD_CLIENT_SECRET"),
            "authorize_url": "https://discord.com/oauth2/authorize",
            "token_url": "https://discord.com/api/oauth2/token",
            "userinfo": {
                "url": "https://discord.com/api/users/@me",
                "identity": lambda json: json["id"],
            },
            "scopes": ["identify"],
        }
    }


class User(UserMixin):
    def __init__(self, user_id: str):
        self.id = user_id


# ----- Helpers -----
def _discord_avatar_url(uid: str, avatar_hash: str | None) -> str | None:
    """
    Build a Discord CDN avatar URL. Supports animated GIFs (hash starts with 'a_').
    """
    if not avatar_hash:
        return None
    ext = "gif" if avatar_hash.startswith("a_") else "png"
    return f"https://cdn.discordapp.com/avatars/{uid}/{avatar_hash}.{ext}"


# ----- Routes -----

@auth_bp.get("/auth/<provider>")
def auth(provider: str):
    """
    Start OAuth2 login by redirecting to the provider's authorization URL.
    Optional ?next=/kb/some/page to return the user after login.
    """
    if not current_user.is_anonymous:
        print("current_user found")
        return redirect("/kb/")

    provider_data = app.config["OAUTH2_PROVIDERS"].get(provider)
    if not provider_data:
        abort(404)

    # Save CSRF state (and optional next) in session
    state = secrets.token_urlsafe(16)
    session["oauth2_state"] = state
    next_url = request.args.get("next")
    if next_url:
        session["oauth2_next"] = next_url

    redirect_uri = url_for("api.auth.callback", provider=provider, _external=True)
    query = urlencode(
        {
            "client_id": provider_data["client_id"],
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(provider_data["scopes"]),
            "state": state,
            # "prompt": "consent",  # uncomment during dev to force the consent screen
        }
    )
    return redirect(f'{provider_data["authorize_url"]}?{query}')


@auth_bp.get("/auth/<provider>/callback")
def callback(provider: str):
    """
    OAuth2 callback. Exchanges code for tokens, fetches user info,
    stores display fields in session, logs the user in, and redirects to the SPA.
    """
    if not current_user.is_anonymous:
        return redirect("/kb/")

    provider_data = app.config["OAUTH2_PROVIDERS"].get(provider)
    if not provider_data:
        abort(404)

    # Handle provider error short-circuit
    if any(k.startswith("error") for k in request.args):
        print(request)
        return redirect("/kb/?login=error")

    # Validate state and presence of code
    if request.args.get("state") != session.get("oauth2_state"):
        abort(401)
    code = request.args.get("code")
    if not code:
        abort(401)
    # Exchange code for access token
    try:
        redirect_uri = url_for("api.auth.callback", provider=provider, _external=True)
        token_res = requests.post(
            provider_data["token_url"],
            data={
                "client_id": provider_data["client_id"],
                "client_secret": provider_data["client_secret"],
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout=10,
        )
    except requests.RequestException as e:
        return redirect("/kb/?login=error")
    if token_res.status_code != 200:
        return redirect("/kb/?login=error")
    access_token = token_res.json().get("access_token")
    if not access_token:
        return redirect("/kb/?login=error")

    # Fetch user info
    try:
        me_res = requests.get(
            provider_data["userinfo"]["url"],
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
            timeout=10,
        )
    except requests.RequestException:
        return redirect("/kb/?login=error")

    if me_res.status_code != 200:
        return redirect("/kb/?login=error")

    data = me_res.json()
    identity = provider_data["userinfo"]["identity"](data)

    # Stash display info for SPA header
    session["display_name"] = data.get("global_name") or data.get("username")
    session["avatar_url"] = _discord_avatar_url(identity, data.get("avatar"))

    # Log the user in with a stable key (no DB required)
    login_user(User(f"{provider}:{identity}"))

    # Clean up + redirect to SPA
    next_url = session.pop("oauth2_next", None)
    session.pop("oauth2_state", None)
    return redirect(next_url or "/kb/?login=ok")


@auth_bp.get("/logout")
def logout():
    """
    Browser-friendly logout: clear session and go back to the SPA.
    """
    logout_user()
    session.clear()
    return redirect("/kb/?logout=ok")


@auth_bp.post("/api/logout")
def api_logout():
    """
    JSON logout for XHR calls from the SPA.
    """
    logout_user()
    session.clear()
    return jsonify({"ok": True})

@auth_bp.get("/me")
def me():
    is_auth = not current_user.is_anonymous
    user_id = current_user.get_id() if is_auth else None

    # Optional: split provider:id -> provider, identity
    provider = identity = None
    if user_id and ":" in user_id:
        provider, identity = user_id.split(":", 1)
    res = {
        "authenticated": is_auth,
        "user": {
            "id": user_id,
            "provider": provider,
            "identity": identity,
            "display_name": session.get("display_name") if is_auth else None,
            "avatar_url": session.get("avatar_url") if is_auth else None,
        },
        # Handy URLs for the frontend:
        "login_url": url_for("api.auth.auth", provider="discord"),
        "logout_url": url_for("api.auth.api_logout"),
    }
    return http_success(res)
