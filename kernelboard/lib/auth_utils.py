import secrets
import os
from typing import Any, Optional

from flask import session
from flask_login import current_user

from kernelboard.lib.db import get_db_connection
import logging

logger = logging.getLogger(__name__)


def get_provider_and_identity(user_id: Optional[str]) -> Any:
    provider = identity = None
    if user_id and ":" in user_id:
        provider, identity = user_id.split(":", 1)
    return {
        "provider": provider,
        "identity": identity,
    }


def get_user_info_from_session() -> Any:
    is_auth = not current_user.is_anonymous
    user_id = current_user.get_id() if is_auth else None
    d = get_provider_and_identity(user_id)
    provider = d["provider"]
    identity = d["identity"]
    res = {
        "authenticated": is_auth,
        "user": {
            "id": user_id,
            "provider": provider,
            "identity": identity,
            "display_name": session.get("display_name") if is_auth else None,
            "avatar_url": session.get("avatar_url") if is_auth else None,
            "is_admin": identity in get_whitelist() if is_auth and identity else False,
        },
    }
    return res


def get_id_and_username_from_session():
    """
    Get identity, display_name from session.
    Returns:
        (identity, display_name, is_auth)
        - identity: str or None
        - display_name: str or None
    """
    info = get_user_info_from_session()
    identity = info["user"]["identity"]
    display_name = info["user"]["display_name"]
    return identity, display_name


def is_auth() -> bool:
    return not current_user.is_anonymous


def ensure_user_info_with_token(user_id: int, user_name: str) -> Optional[Any]:
    """
    Idempotent behavior:
    - If user does not exist -> INSERT with new token and return the row.
    - If user exists and web_auth_id IS NULL -> UPDATE to set token and return the row.
    - If user exists and web_auth_id IS NOT NULL -> do not overwrite; just SELECT and return existing row.
    """
    new_token = secrets.token_hex(16)
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Attempt "insert or update only if web_auth_id is NULL"
        cur.execute(
            """
            INSERT INTO leaderboard.user_info (id, user_name, web_auth_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO UPDATE
            SET web_auth_id = EXCLUDED.web_auth_id
            WHERE leaderboard.user_info.web_auth_id IS NULL
            RETURNING id, user_name, web_auth_id
            """,
            (user_id, user_name, new_token),
        )
        row = cur.fetchone()

        # row exists if inserted new row OR updated an existing row with NULL token
        if row:
            return row

        # if no upsert was done, fetch the existing row and return it
        cur.execute(
            """
            SELECT id, user_name, web_auth_id
            FROM leaderboard.user_info
            WHERE id = %s
            """,
            (user_id,),
        )
        return cur.fetchone()


def get_whitelist(leaderboard_id: str = "") -> set[str]:
    """
     return a unique set of cleaned Discord user IDs.
    TODO: move this to a db table if more roles are needed
    """
    if not isinstance(leaderboard_id, str):
        leaderboard_id = str(leaderboard_id)

    # GpuMode CORE Team, always have access to all leaderboards
    GPU_TEAM_WHITE_LIST = [
        "1372260358621888674",
        "489144435032981515",
        "838132355075014667",
        "325883680419610631",
        "557943190045327360",
        "1394757548833509408",
    ]

    whitelist = GPU_TEAM_WHITE_LIST

    # Add leaderboard based white_list,notice leaderboard_id is a string
    return set(whitelist)
