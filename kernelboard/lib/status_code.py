from flask import jsonify
from http import HTTPStatus


def make_response(
    data=None, message="Success", code=0, status_code=HTTPStatus.OK
):
    return jsonify({"code": code, "message": message, "data": data}), int(
        status_code
    )


def http_success(data=None, message="Success"):
    return make_response(
        data=data, message=message, code=0, status_code=HTTPStatus.OK
    )


def http_error(
    message="Error",
    code=10000,
    status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
    data=None,
):
    return make_response(
        data=data, message=message, code=code, status_code=status_code
    )
