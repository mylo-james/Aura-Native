from flask import g, jsonify


class ApiError(Exception):
    def __init__(self, status, code, message, fields=None):
        super().__init__(message)
        self.status, self.code, self.message, self.fields = (
            status,
            code,
            message,
            fields,
        )


def error_response(status, code, message, fields=None):
    error = {
        "code": code,
        "message": message,
        "requestId": getattr(g, "request_id", None),
    }
    if fields:
        error["fields"] = fields
    return jsonify(error=error), status
