import asyncio
import base64
import datetime
import json
import os
import time
from dataclasses import asdict
from typing import Annotated, Any, Optional, Tuple

from fastapi import Depends, FastAPI, Header, HTTPException, Request, UploadFile, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse


from libkernelbot.backend import KernelBackend
from libkernelbot.consts import SubmissionMode
from libkernelbot.leaderboard_db import LeaderboardDB, LeaderboardRankedEntry
from libkernelbot.submission import SubmissionRequest
from libkernelbot.utils import KernelBotError,
from src.kernelbot.api.submission_run_utils import sse_stream_submission, start_detached_run
from src.libkernelbot.db_types import IdentityType

from .api_utils import _handle_discord_oauth, _handle_github_oauth, to_submission_info

# yes, we do want  ... = Depends() in function signatures
# ruff: noqa: B008

app = FastAPI()



backend_instance: KernelBackend = None

_last_action = time.time()
_submit_limiter = asyncio.Semaphore(3)

async def simple_rate_limit():
    """
    A very primitive rate limiter. This function returns at most
    10 times per second. Even if someone spams the API with
    requests, we're not hammering the bot.

    Note that there is no forward progress guarantee here:
    If we continually get new requests at a rate > 10/second,
    it is theoretically possible that some threads never exit the
    loop. We can worry about this as we scale up, and in any case
    it is better than hanging the discord bot.
    """
    global _last_action
    while time.time() - _last_action < 0.1:
        await asyncio.sleep(0.1)
    _last_action = time.time()
    return


def init_api(_backend_instance: KernelBackend):
    global backend_instance
    backend_instance = _backend_instance


@app.exception_handler(KernelBotError)
async def kernel_bot_error_handler(req: Request, exc: KernelBotError):
    return JSONResponse(status_code=exc.http_code, content={"message": str(exc)})


def get_db():
    """Database context manager with guaranteed error handling"""
    if not backend_instance:
        raise HTTPException(status_code=500, detail="Bot instance not initialized")

    return backend_instance.db


async def validate_cli_header(
    x_popcorn_cli_id: Optional[str] = Header(None, alias="X-Popcorn-Cli-Id"),
    db_context=Depends(get_db),
) -> str:
    """
    FastAPI dependency to validate the X-Popcorn-Cli-Id header.

    Raises:
        HTTPException: If the header is missing or invalid.

    Returns:
        str: The validated user ID associated with the CLI ID.
    """
    if not x_popcorn_cli_id:
        raise HTTPException(status_code=400, detail="Missing X-Popcorn-Cli-Id header")

    try:
        with db_context as db:
            user_info = db.validate_cli_id(x_popcorn_cli_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error during validation: {e}") from e

    if user_info is None:
        raise HTTPException(status_code=401, detail="Invalid or unauthorized X-Popcorn-Cli-Id")

    return user_info


@app.get("/auth/init")
async def auth_init(provider: str, db_context=Depends(get_db)) -> dict:
    if provider not in ["discord", "github"]:
        raise HTTPException(
            status_code=400, detail="Invalid provider, must be 'discord' or 'github'"
        )

    """
    Initialize authentication flow for the specified provider.
    Returns a random UUID to be used as state parameter in the OAuth flow.

    Args:
        provider (str): The authentication provider ('discord' or 'github')

    Returns:
        dict: A dictionary containing the state UUID
    """
    import uuid

    state_uuid = str(uuid.uuid4())

    try:
        with db_context as db:
            # Assuming init_user_from_cli exists and handles DB interaction
            db.init_user_from_cli(state_uuid, provider)
    except AttributeError as e:
        # Catch if leaderboard_db methods don't exist
        raise HTTPException(status_code=500, detail=f"Database interface error: {e}") from e
    except Exception as e:
        # Catch other potential errors during DB interaction
        raise HTTPException(status_code=500, detail=f"Failed to initialize auth in DB: {e}") from e

    return {"state": state_uuid}


@app.get("/auth/cli/{auth_provider}")
async def cli_auth(auth_provider: str, code: str, state: str, db_context=Depends(get_db)):  # noqa: C901
    """
    Handle Discord/GitHub OAuth redirect. This endpoint receives the authorization code
    and state parameter from the OAuth flow.

    Args:
        auth_provider (str): 'discord' or 'github'
        code (str): Authorization code from OAuth provider
        state (str): Base64 encoded state containing cli_id and is_reset flag
    """

    if auth_provider not in ["discord", "github"]:
        raise HTTPException(
            status_code=400, detail="Invalid provider, must be 'discord' or 'github'"
        )

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing authorization code or state")

    try:
        # Pad state if necessary for correct base64 decoding
        state_padded = state + "=" * (4 - len(state) % 4) if len(state) % 4 else state
        state_json = base64.urlsafe_b64decode(state_padded).decode("utf-8")
        state_data = json.loads(state_json)
        cli_id = state_data["cli_id"]
        is_reset = state_data.get("is_reset", False)
    except (json.JSONDecodeError, KeyError, Exception) as e:
        raise HTTPException(status_code=400, detail=f"Invalid state parameter: {e}") from None

    # Determine API URL (handle potential None value)
    api_base_url = os.environ.get("HEROKU_APP_DEFAULT_DOMAIN_NAME") or os.getenv("POPCORN_API_URL")
    if not api_base_url:
        raise HTTPException(
            status_code=500,
            detail="Redirect URI base not configured."
            "Set HEROKU_APP_DEFAULT_DOMAIN_NAME or POPCORN_API_URL.",
        )
    redirect_uri_base = api_base_url.rstrip("/")
    redirect_uri = f"https://{redirect_uri_base}/auth/cli/{auth_provider}"

    user_id = None
    user_name = None

    try:
        if auth_provider == "discord":
            user_id, user_name = await _handle_discord_oauth(code, redirect_uri)
        elif auth_provider == "github":
            user_id, user_name = await _handle_github_oauth(code, redirect_uri)

    except HTTPException as e:
        # Re-raise HTTPExceptions from helpers
        raise e
    except Exception as e:
        # Catch unexpected errors during OAuth handling
        raise HTTPException(
            status_code=500, detail=f"Error during {auth_provider} OAuth flow: {e}"
        ) from e

    if not user_id or not user_name:
        raise HTTPException(
            status_code=500, detail="Failed to retrieve user ID or username from provider."
        )

    try:
        with db_context as db:
            if is_reset:
                db.reset_user_from_cli(user_id, cli_id, auth_provider)
            else:
                db.create_user_from_cli(user_id, user_name, cli_id, auth_provider)

    except AttributeError as e:
        raise HTTPException(
            status_code=500, detail=f"Database interface error during update: {e}"
        ) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database update failed: {e}") from e

    return {
        "status": "success",
        "message": f"Successfully authenticated via {auth_provider} and linked CLI ID.",
        "user_id": user_id,
        "user_name": user_name,
        "is_reset": is_reset,
    }

async def validate_user_header(
    x_web_auth_id: Optional[str] = Header(None, alias="X-Web-Auth-Id"),
    x_popcorn_cli_id: Optional[str] = Header(None, alias="X-Popcorn-Cli-Id"),
    db_context: LeaderboardDB =Depends(get_db),
) -> Any:
    """
    Validate either X-Web-Auth-Id or X-Popcorn-Cli-Id and return the associated user id.
    Prefers X-Web-Auth-Id if both are provided.
    """
    token = x_web_auth_id or x_popcorn_cli_id
    if not token:
        raise HTTPException(
            status_code=400,
            detail="Missing X-Web-Auth-Id or X-Popcorn-Cli-Id header",
        )

    if x_web_auth_id:
        token = x_web_auth_id
        id_type = IdentityType.WEB
    elif x_popcorn_cli_id:
        token = x_popcorn_cli_id
        id_type = IdentityType.CLI
    else:
        raise HTTPException(
            status_code=400,
            detail="Missing header must be eother X-Web-Auth-Id or X-Popcorn-Cli-Id header",
        )
    try:
        with db_context as db:
            user_info = db.validate_identity(token, id_type)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error during validation: {e}",
        ) from e

    if not user_info:
        raise HTTPException(
            status_code=401,
            detail="Invalid or unauthorized auth header",
        )
    return user_info

@app.post("/{leaderboard_name}/{gpu_type}/{submission_mode}")
async def run_submission(  # noqa: C901
    leaderboard_name: str,
    gpu_type: str,
    submission_mode: str,
    file: UploadFile,
    user_info: Annotated[dict, Depends(validate_cli_header)],
    db_context=Depends(get_db),
) -> StreamingResponse:
    """An endpoint that runs a submission on a given leaderboard, runner, and GPU type.
    Streams status updates and the final result via Server-Sent Events (SSE).

    Requires a valid X-Popcorn-Cli-Id header.

    Args:
        leaderboard_name (str): The name of the leaderboard to run the submission on.
        gpu_type (str): The type of GPU to run the submission on.
        submission_mode (str): The mode for the submission (test, benchmark, etc.).
        file (UploadFile): The file to run the submission on.
        user_id (str): The validated user ID obtained from the X-Popcorn-Cli-Id header.

    Raises:
        HTTPException: If the kernelbot is not initialized, or header/input is invalid.

    Returns:
        StreamingResponse: A streaming response containing the status and results of the submission.
    """
    await simple_rate_limit()
    submission_request,submission_mode_enum = await to_submission_info(
        user_info,
        submission_mode,
        file,
        leaderboard_name,
        gpu_type,
        db_context)

    generator = sse_stream_submission(
        submission_request=submission_request,
        submission_mode_enum=submission_mode_enum,
        backend=backend_instance,
    )
    return StreamingResponse(generator, media_type="text/event-stream")

@app.post("submission/{leaderboard_name}/{gpu_type}/{submission_mode}")
async def run_submission_v2(  # noqa: C901
    leaderboard_name: str,
    gpu_type: str,
    submission_mode: str,
    file: UploadFile,
    user_info: Annotated[dict, Depends(validate_user_header)],
    db_context=Depends(get_db),
    background_tasks: BackgroundTasks = Depends()
) -> Any:

    await simple_rate_limit()

    submission_request,submission_mode_enum = await to_submission_info(
        user_info,
        submission_mode,
        file,
        leaderboard_name,
        gpu_type,
        db_context)

    sub_id = start_detached_run(submission_request, submission_mode_enum, backend_instance, db_context, background_tasks)
    return JSONResponse(
        status_code=202,
        content={"submission_id": sub_id, "status": "accepted"},
    )


@app.get("/leaderboards")
async def get_leaderboards(db_context=Depends(get_db)):
    """An endpoint that returns all leaderboards.

    Returns:
        list[LeaderboardItem]: A list of serialized `LeaderboardItem` objects,
        which hold information about the leaderboard, its deadline, its reference code,
        and the GPU types that are available for submissions.
    """
    await simple_rate_limit()
    try:
        with db_context as db:
            return db.get_leaderboards()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching leaderboards: {e}") from e


@app.get("/gpus/{leaderboard_name}")
async def get_gpus(leaderboard_name: str, db_context=Depends(get_db)) -> list[str]:
    """An endpoint that returns all GPU types that are available for a given leaderboard and runner.

    Args:
        leaderboard_name (str): The name of the leaderboard to get the GPU types for.
        runner_name (str): The name of the runner to get the GPU types for.

    Returns:
        list[str]: A list of GPU types that are available for the given leaderboard and runner.
    """
    await simple_rate_limit()
    try:
        with db_context as db:
            return db.get_leaderboard_gpu_types(leaderboard_name)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching GPU data: {e}") from e


@app.get("/submissions/{leaderboard_name}/{gpu_name}")
async def get_submissions(
    leaderboard_name: str,
    gpu_name: str,
    limit: int = None,
    offset: int = 0,
    db_context=Depends(get_db),
) -> list[LeaderboardRankedEntry]:
    await simple_rate_limit()
    try:
        with db_context as db:
            # Add validation for leaderboard and GPU? Might be redundant if DB handles it.
            return db.get_leaderboard_submissions(
                leaderboard_name, gpu_name, limit=limit, offset=offset
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching submissions: {e}") from e


@app.get("/submission_count/{leaderboard_name}/{gpu_name}")
async def get_submission_count(
    leaderboard_name: str, gpu_name: str, user_id: str = None, db_context=Depends(get_db)
) -> dict:
    """Get the total count of submissions for pagination"""
    await simple_rate_limit()
    try:
        with db_context as db:
            count = db.get_leaderboard_submission_count(leaderboard_name, gpu_name, user_id)
            return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching submission count: {e}") from e
