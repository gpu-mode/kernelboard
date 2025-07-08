from enum import IntEnum
from flask import jsonify

# kernelboard/utils/response.py
from flask import jsonify
from enum import IntEnum


class HttpStatusCode(IntEnum):
    OK = 200
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    INTERNAL_SERVER_ERROR = 500


def make_response(data=None, message="Success", code=0, status_code=HttpStatusCode.OK):
    return jsonify({"code": code, "message": message, "data": data}), int(status_code)


def httpSuccess(data=None, message="Success"):
    return make_response(
        data=data, message=message, code=0, status_code=HttpStatusCode.OK
    )


def httpError(
    message="Error",
    code=10000,
    status_code=HttpStatusCode.INTERNAL_SERVER_ERROR,
    data=None,
):
    return make_response(data=data, message=message, code=code, status_code=status_code)
