import ast
import re
import mimetypes
from werkzeug.utils import secure_filename
from kernelboard.lib.error import InvalidMimeError, InvalidSyntaxError,InvalidPythonExtensionError,MissingRequiredFieldError

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

    # Validate extension
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTS:
        raise InvalidPythonExtensionError()

    # Peek first 2KB for quick checks and MIME guessing
    sample = f.stream.read(2048)
    f.stream.seek(0)

    # Reject binary content quickly
    if b"\x00" in sample or _TEXT_CTRL_RE.search(sample):
        raise InvalidMimeError(message="binary content detected; not Python text")

    # Guess MIME type without libmagic
    mime = _guess_python_mime(filename, sample)

    # Full read (bounded by MAX_CONTENT_LENGTH)
    raw = f.stream.read(MAX_CONTENT_LENGTH + 1)
    f.stream.seek(0)
    if not raw:
        raise InvalidSyntaxError("file is empty")
    if len(raw) > MAX_CONTENT_LENGTH:
        raise InvalidSyntaxError(f"file too large (> {MAX_CONTENT_LENGTH} bytes)")
    if b"\x00" in raw or _TEXT_CTRL_RE.search(raw):
        raise InvalidMimeError(message="binary content detected; not Python text")

    # Decode as UTF-8
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        raise InvalidSyntaxError("file is not valid UTF-8 text")

    # Validate syntax with AST
    try:
        ast.parse(text, filename=filename, mode="exec")
    except SyntaxError as e:
        raise InvalidSyntaxError(f"{e.msg} at line {e.lineno}")

    return filename, mime, f


def _guess_python_mime(filename: str, sample: bytes) -> str:
    """
    Guess a Python MIME type without libmagic.
    1. If extension is .py/.pyw → assume "text/x-python".
    2. Otherwise, use mimetypes.guess_type.
    3. If the first line contains a python shebang → "text/x-python".
    4. Fallback to "application/octet-stream".
    """
    if filename.lower().endswith((".py", ".pyw")):
        return "text/x-python"

    mime, _ = mimetypes.guess_type(filename)
    if mime:
        return mime

    try:
        first_line = sample.splitlines()[0] if sample else b""
    except Exception:
        first_line = b""
    if first_line.startswith(b"#!") and b"python" in first_line.lower():
        return "text/x-python"

    return "application/octet-stream"
