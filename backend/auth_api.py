from __future__ import annotations

from functools import wraps

from flask import Blueprint, current_app, jsonify, request
from itsdangerous import BadSignature, URLSafeSerializer

from auth_store import authenticate_user, create_user, delete_user, list_users


auth_api = Blueprint("auth_api", __name__)


def _token_serializer() -> URLSafeSerializer:
    return URLSafeSerializer(current_app.config["SECRET_KEY"], salt="drums-auth")


def _build_token(user: dict[str, str]) -> str:
    return _token_serializer().dumps(
        {"username": user["username"], "role": user["role"]}
    )


def _read_bearer_token() -> str | None:
    authorization_header = request.headers.get("Authorization", "")
    if not authorization_header.startswith("Bearer "):
        return None

    return authorization_header[7:].strip() or None


def _read_authenticated_user() -> dict[str, str] | None:
    token = _read_bearer_token()
    if not token:
        return None

    try:
        payload = _token_serializer().loads(token)
    except BadSignature:
        return None

    username = str(payload.get("username", "")).strip()
    role = str(payload.get("role", "")).strip()
    if not username or not role:
        return None

    return {"username": username, "role": role}


def require_admin(view_func):
    @wraps(view_func)
    def wrapped_view(*args, **kwargs):
        authenticated_user = _read_authenticated_user()
        if not authenticated_user:
            return jsonify({"error": "Authentication is required."}), 401

        if authenticated_user.get("role") != "admin":
            return jsonify({"error": "Administrator access is required."}), 403

        request.authenticated_user = authenticated_user
        return view_func(*args, **kwargs)

    return wrapped_view


@auth_api.post("/api/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    user = authenticate_user(username, password)
    if not user:
        return jsonify({"error": "Invalid username or password."}), 401

    return jsonify({"token": _build_token(user), "user": user})


@auth_api.get("/api/users")
@require_admin
def users_index():
    return jsonify({"users": list_users()})


@auth_api.post("/api/users")
@require_admin
def users_create():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "user")).strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    try:
        created_user = create_user(username, password, role)
    except ValueError as create_error:
        return jsonify({"error": str(create_error)}), 400

    return jsonify({"user": created_user}), 201


@auth_api.delete("/api/users/<string:username>")
@require_admin
def users_delete(username: str):
    try:
        deleted_user = delete_user(
            username,
            request.authenticated_user["username"],
        )
    except ValueError as delete_error:
        error_message = str(delete_error)
        status_code = 404 if error_message == "User not found." else 400
        return jsonify({"error": error_message}), status_code

    return jsonify({"user": deleted_user})
