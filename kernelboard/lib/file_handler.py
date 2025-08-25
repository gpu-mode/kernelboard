import ast, re, magic
from typing import List
from flask import current_app
from werkzeug.utils import secure_filename
from errors import (
    ValidationError, MissingRequiredFieldError, InvalidPythonExtensionError,
    InvalidMimeError, InvalidSyntaxError
)
from kernelboard.lib.error import validate_required_fields

ALLOWED_EXTS = {".py"}
ALLOWED_PYTHON_MIMES = {"text/x-python", "text/x-script.python", "text/plain"}
MAX_CONTENT_LENGTH = 1_000_000  # 1 MB cap for file content you parse
_TEXT_CTRL_RE = re.compile(rb"[\x00-\x08\x0B\x0C\x0E-\x1F]")

def get_submission_file_info(request):
    if "file" not in request.files:
        raise MissingRequiredFieldError()

    f = request.files["file"]
    filename = secure_filename(f.filename or "")
    if not filename:
        raise MissingRequiredFieldError(
            "missing required submission python file, if this is unexpected, please contact the gpumode administrator"
        )

    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTS:
        raise InvalidPythonExtensionError()

    # MIME sniff (peek)
    sample = f.stream.read(2048)
    f.stream.seek(0)
    mime = magic.from_buffer(sample, mime=True) or ""
    if mime not in ALLOWED_PYTHON_MIMES:
        raise InvalidMimeError(mime=mime)

    # Full bounded read for validation
    raw = f.stream.read(MAX_CONTENT_LENGTH + 1)
    f.stream.seek(0)
    if not raw:
        raise InvalidSyntaxError("file is empty")
    if len(raw) > MAX_CONTENT_LENGTH:
        raise InvalidSyntaxError(f"file too large (> {MAX_CONTENT_LENGTH} bytes)")
    if _TEXT_CTRL_RE.search(raw) or b"\x00" in raw:
        raise InvalidMimeError(message="binary content detected; not Python text")

    try:
        text = raw.decode("utf-8", errors="strict")
        ast.parse(text, filename=filename, mode="exec")
    except UnicodeDecodeError:
        raise InvalidSyntaxError("file is not valid UTF-8 text")
    except SyntaxError as e:
        raise InvalidSyntaxError(f"{e.msg} at line {e.lineno}")

    return filename, mime, f
