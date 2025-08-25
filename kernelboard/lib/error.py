import http
from typing import List

class ValidationError(Exception):
    def __init__(self, message: str,
                 status: http.HTTPStatus = http.HTTPStatus.BAD_REQUEST,
                 code: int | None = None, **extras):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code or (10000 + status.value)
        self.extras = extras

class MissingRequiredFieldError(ValidationError):
    def __init__(self, message="missing required submission python file"):
        super().__init__(message, http.HTTPStatus.BAD_REQUEST, 100400)

class InvalidPythonExtensionError(ValidationError):
    def __init__(self, message="invalid file extension, only single python file with .py allowed"):
        super().__init__(message, http.HTTPStatus.BAD_REQUEST, 100401)

class InvalidMimeError(ValidationError):
    def __init__(self, mime: str | None = None, message: str | None = None):
        msg = message or (f"invalid MIME type: {mime}, expected Python source")
        super().__init__(msg, http.HTTPStatus.UNSUPPORTED_MEDIA_TYPE, 100415, mime=mime)

class InvalidSyntaxError(ValidationError):
    def __init__(self, detail: str):
        super().__init__(f"invalid Python syntax: {detail}",
                         http.HTTPStatus.UNPROCESSABLE_ENTITY, 100422)


def validate_required_fields(data: dict, field_names: List[str] ):
    """
    Validate that the request data contains the required fields.
    Args:
        data: dictionary (could be request.form, request.json, etc.)
    Raises:
        MissingRequiredFieldError if any field is missing
    """
    for field in field_names:
        value = data.get(field)
        if not value:
            raise MissingRequiredFieldError(
                f"Missing required field: {field.lower()}"
            )
