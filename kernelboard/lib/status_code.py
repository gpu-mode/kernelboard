from http import HTTPStatus

from flask import jsonify


class HttpError(Exception):
    def __init__(self, message, status_code=500, code=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = 10000
        if code:
            self.code = code
        else:
            self.code = 10000 + self.status_code


def make_response(data=None, message="Success", code=0, status_code=HTTPStatus.OK):
    return jsonify({"code": code, "message": message, "data": data}), int(status_code)


def http_success(data=None, message="Success"):
    return make_response(data=data, message=message, code=0, status_code=HTTPStatus.OK)


def http_error(
    message="Error",
    code=None,
    status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
    data=None,
):
    res_code = 10000
    if code:
        res_code = code
    else:
        res_code = 10000 + status_code

    return make_response(
        data=data, message=message, code=res_code, status_code=status_code
    )
