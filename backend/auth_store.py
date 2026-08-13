from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from werkzeug.security import check_password_hash, generate_password_hash


USER_STORE_PATH = Path(__file__).resolve().parent / "database" / "users.json"
ALLOWED_ROLES = {"admin", "user"}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_users() -> list[dict[str, str]]:
    default_password = os.getenv("INITIAL_ADMIN_PASSWORD", "admin123")
    return [
        {
            "username": "admin",
            "passwordHash": generate_password_hash(default_password),
            "role": "admin",
            "createdAt": _utc_now_iso(),
        }
    ]


def _write_users(users: list[dict[str, str]]) -> None:
    USER_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    USER_STORE_PATH.write_text(json.dumps(users, indent=2), encoding="utf-8")


def load_users() -> list[dict[str, str]]:
    if not USER_STORE_PATH.exists():
        users = _default_users()
        _write_users(users)
        return users

    try:
        users = json.loads(USER_STORE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        users = _default_users()
        _write_users(users)
        return users

    if not isinstance(users, list):
        users = _default_users()
        _write_users(users)
        return users

    normalized_users = []
    has_admin = False

    for user in users:
        if not isinstance(user, dict):
            continue

        username = str(user.get("username", "")).strip()
        password_hash = str(user.get("passwordHash", "")).strip()
        role = str(user.get("role", "")).strip().lower()
        created_at = str(user.get("createdAt", "")).strip() or _utc_now_iso()

        if not username or not password_hash or role not in ALLOWED_ROLES:
            continue

        if role == "admin":
            has_admin = True

        normalized_users.append(
            {
                "username": username,
                "passwordHash": password_hash,
                "role": role,
                "createdAt": created_at,
            }
        )

    if not normalized_users or not has_admin:
        users = _default_users()
        _write_users(users)
        return users

    _write_users(normalized_users)
    return normalized_users


def find_user(username: str) -> dict[str, str] | None:
    normalized_username = username.strip().lower()

    for user in load_users():
        if user["username"].lower() == normalized_username:
            return user

    return None


def serialize_user(user: dict[str, str]) -> dict[str, str]:
    return {
        "username": user["username"],
        "role": user["role"],
        "createdAt": user["createdAt"],
    }


def authenticate_user(username: str, password: str) -> dict[str, str] | None:
    user = find_user(username)
    if not user:
        return None

    if not check_password_hash(user["passwordHash"], password):
        return None

    return serialize_user(user)


def list_users() -> list[dict[str, str]]:
    return [serialize_user(user) for user in load_users()]


def create_user(username: str, password: str, role: str) -> dict[str, str]:
    normalized_username = username.strip()
    normalized_role = role.strip().lower()

    if len(normalized_username) < 3:
        raise ValueError("Username must be at least 3 characters long.")

    if len(password) < 4:
        raise ValueError("Password must be at least 4 characters long.")

    if normalized_role not in ALLOWED_ROLES:
        raise ValueError("Role must be either 'admin' or 'user'.")

    users = load_users()
    if any(user["username"].lower() == normalized_username.lower() for user in users):
        raise ValueError("A user with that username already exists.")

    new_user = {
        "username": normalized_username,
        "passwordHash": generate_password_hash(password),
        "role": normalized_role,
        "createdAt": _utc_now_iso(),
    }
    users.append(new_user)
    _write_users(users)
    return serialize_user(new_user)
