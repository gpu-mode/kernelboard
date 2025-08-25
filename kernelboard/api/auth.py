from __future__ import annotations

from ast import Tuple
import os
import secrets
from typing import Any, Optional
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
from kernelboard.lib.auth_utils import ensure_user_info_with_token, get_user_info_from_session

from kernelboard.lib.status_code import http_success

auth_bp = Blueprint("auth", __name__)

_ALLOWED_ERROR_KEYS = {
    "error",
    "error_description",
}  # never forward code/state/secrets


def _sanitize(s: str, *, max_len: int = 300) -> str:
    """Keep it short, printable, and safe to render."""
    if not s:
        return ""
    s = "".join(ch for ch in s if ch.isprintable())
    return s[:max_len]


def redirect_with_error(error: str, message: str = ""):
    q = {"error": _sanitize(error)}
    if message:
        q["message"] = _sanitize(message)
    return redirect(f"/kb/login?{urlencode(q)}")


def _error_params_from_provider(args) -> dict[str, str]:
    """Pick only safe keys from provider error response and normalize names."""
    err = args.get("error") or "provider_error"
    desc = args.get("error_description") or ""
    return {
        "error": _sanitize(err),
        "message": _sanitize(desc),  # frontends usually prefer 'message'
    }


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
        return redirect("/kb/404")

    # Save CSRF state (and optional next) in session
    state = secrets.token_urlsafe(16)
    session["oauth2_state"] = state
    next_url = request.args.get("next")
    if next_url:
        session["oauth2_next"] = next_url

    redirect_uri = url_for(
        "api.auth.callback", provider=provider, _external=True
    )
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
        return redirect("/kb/login?error=invalid_provider")

    # Handle provider error short-circuit
    if any(k in _ALLOWED_ERROR_KEYS for k in request.args):
        # Validate state even on error to avoid CSRF reflection
        if request.args.get("state") != session.get("oauth2_state"):
            app.logger.error(
                "OAuth error but invalid state; args=%s", dict(request.args)
            )
            return redirect_with_error("invalid_state", "State did not match")
        # Forward only whitelisted error info
        safe = _error_params_from_provider(request.args)
        app.logger.info(
            "OAuth provider error: %s", safe
        )  # log sanitized version
        return redirect(f"/kb/login?{urlencode(safe)}")

    # Validate state and presence of code
    if request.args.get("state") != session.get("oauth2_state"):
        app.logger.error(
            "Invalid state (no error from provider); args=%s",
            dict(request.args),
        )
        return redirect_with_error("invalid_state", "State did not match")

    code = request.args.get("code")
    if not code:
        app.logger.error("Missing authorization code")
        return redirect_with_error(
            "missing_code", "Authorization code not found"
        )

    # Exchange code for access token
    try:
        redirect_uri = url_for(
            "api.auth.callback", provider=provider, _external=True
        )
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
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout=10,
        )
    except requests.RequestException as e:
        app.logger.exception("Token exchange request failed")
        return redirect_with_error(
            "request_error", "Network error during token exchange"
        )

    if token_res.status_code != 200:
        # Don't echo token_res.text; it can contain sensitive diagnostics
        app.logger.error(
            "Token exchange failed: status=%s", token_res.status_code
        )
        return redirect_with_error(
            "token_error", "Failed to exchange authorization code"
        )

    access_token = (token_res.json() or {}).get("access_token")
    if not access_token:
        app.logger.error(
            "Token exchange missing access_token: payload=%s", token_res.json()
        )
        return redirect_with_error("token_error", "Access token missing")

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
        app.logger.exception("Userinfo request failed")
        return redirect_with_error(
            "request_error", "Network error fetching user info"
        )

    if me_res.status_code != 200:
        app.logger.error("Userinfo failed: status=%s", me_res.status_code)
        return redirect_with_error(
            "response_error", "Failed to fetch user info"
        )

    data = me_res.json() or {}
    identity = provider_data["userinfo"]["identity"](data)
    username = data.get("global_name") or data.get("username") or "unknown"

    # 4) Stash display-only info (safe for SPA header)
    session["display_name"] = username
    session["avatar_url"] = _discord_avatar_url(identity, data.get("avatar"))

    # ensure user exists and has web_auth_id
    # if not, update the user with the new token
    ensure_user_info_with_token(identity, username)

    # 5) Log in
    login_user(User(f"{provider}:{identity}"))

    # 6) Clean up and redirec
    next_url = session.pop("oauth2_next", None)
    session.pop("oauth2_state", None)
    return redirect(next_url or "/kb/")


@auth_bp.get("/logout")
def logout():
    """
    Browser-friendly logout: clear session and go back to the SPA.
    """
    logout_user()
    session.clear()
    return http_success()


@auth_bp.get("/me")
def me():
    res = get_user_info_from_session()
    res.update({"login_url": url_for("api.auth.auth", provider="discord")})
    res.update({"logout_url": url_for("api.auth.logout")})
    return http_success(res)
