"""Admin-only editing of the fixed backend configuration file."""
from __future__ import annotations

import hashlib
import json
import os
import tempfile
import subprocess
from pathlib import Path
from threading import Lock

from flask import Blueprint, current_app, jsonify, request

from auth_api import require_admin
from auth_store import list_users
from engine_mapping_config import resolve_vessel_mappings

config_api = Blueprint("config_api", __name__)
CONFIG_PATH = Path(__file__).resolve().parent / "backend_config.json"
CONFIG_LOCK = Lock()


def schedule_backend_restart():
    # systemd owns the timer so it survives termination of this service.
    subprocess.run(
        ["sudo", "-n", "/usr/bin/systemd-run", "--on-active=3s",
         "/usr/bin/systemctl", "restart", "drums-backend.service"],
        check=True, capture_output=True, timeout=10,
    )


def validate_config(config):
    if not isinstance(config, dict):
        raise ValueError("Configuration must be a JSON object.")
    for section in ("database_connection", "history_trend", "overview_trend", "vessels"):
        if not isinstance(config.get(section), dict):
            raise ValueError(f"{section} must be an object.")

    def check_values(value, path="config"):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in ("port", "default_window_minutes", "default_window_hours", "max_range_days", "max_points_per_series") or key.endswith("_timeout_seconds"):
                    if type(item) is not int or item <= 0:
                        raise ValueError(f"{path}.{key} must be a positive integer.")
                check_values(item, f"{path}.{key}")
        elif isinstance(value, list):
            for item in value:
                check_values(item, path)
    check_values(config)
    connection = config["database_connection"]
    for key in ("host", "user", "password"):
        if not isinstance(connection.get(key), str):
            raise ValueError(f"database_connection.{key} must be a string.")
    if type(connection.get("port")) is not int or not 1 <= connection["port"] <= 65535:
        raise ValueError("database_connection.port must be between 1 and 65535.")
    for section in ("history_trend", "overview_trend"):
        for key, value in config[section].items():
            if key.endswith("_column") or key in ("database_path", "table_name", "channel_filter_unit_exclude"):
                if not isinstance(value, str):
                    raise ValueError(f"{section}.{key} must be a string.")
    series = config["history_trend"].get("default_series", [])
    if not isinstance(series, list) or not all(isinstance(item, str) for item in series):
        raise ValueError("history_trend.default_series must be an array of strings.")
    for name, vessel in config["vessels"].items():
        if not isinstance(vessel, dict):
            raise ValueError(f"vessels.{name} must be an object.")
        for key in ("label", "database", "channel_table", "data_table", "latest_data_table"):
            if not isinstance(vessel.get(key), str):
                raise ValueError(f"vessels.{name}.{key} must be a string.")
        engines = vessel.get("engines")
        if not isinstance(engines, list):
            raise ValueError(f"vessels.{name}.engines must be an array.")
        keys = set()
        for engine in engines:
            if not isinstance(engine, dict) or any(not isinstance(engine.get(key), str) or not engine[key].strip() for key in ("key", "label", "serialNo")):
                raise ValueError(f"vessels.{name}: each engine needs key, label and serialNo strings.")
            if engine["key"] in keys:
                raise ValueError(f"vessels.{name}: engine keys must be unique.")
            keys.add(engine["key"])
    resolve_vessel_mappings(config)
    # Reject non-standard JSON numbers such as NaN and Infinity.
    json.dumps(config, allow_nan=False)


def revision(raw):
    return hashlib.sha256(raw).hexdigest()


@config_api.after_request
def prevent_config_caching(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@config_api.route("/api/admin/backend-config", methods=["GET", "PUT"])
@require_admin
def backend_config():
    if not any(user["username"] == request.authenticated_user["username"] and user["role"] == "admin" for user in list_users()):
        return jsonify(error="Administrator access is required."), 403
    if request.content_length and request.content_length > 1024 * 1024:
        return jsonify(error="Configuration must be smaller than 1 MB."), 413
    try:
        with CONFIG_LOCK:
            raw = CONFIG_PATH.read_bytes()
            if request.method == "GET":
                return jsonify(config=json.loads(raw), revision=revision(raw))
            payload = request.get_json(silent=True)
            if not isinstance(payload, dict):
                return jsonify(error="A JSON request object is required."), 400
            if payload.get("revision") != revision(raw):
                return jsonify(error="Configuration changed since loading. Reload before saving."), 409
            config = payload.get("config")
            validate_config(config)
            content = (json.dumps(config, indent=2, ensure_ascii=False, allow_nan=False) + "\n").encode("utf-8")
            temporary_path = None
            try:
                with tempfile.NamedTemporaryFile(dir=CONFIG_PATH.parent, prefix=".backend-config-", delete=False) as temporary:
                    temporary_path = Path(temporary.name)
                    temporary.write(content)
                    temporary.flush()
                    os.fsync(temporary.fileno())
                os.chmod(temporary_path, CONFIG_PATH.stat().st_mode & 0o777)
                os.replace(temporary_path, CONFIG_PATH)
            finally:
                if temporary_path and temporary_path.exists():
                    temporary_path.unlink()
            try:
                schedule_backend_restart()
            except (OSError, subprocess.SubprocessError):
                current_app.logger.warning("Configuration saved, but backend restart could not be scheduled.")
                return jsonify(config=config, revision=revision(content), restartScheduled=False,
                               restartRequired=True,
                               warning="Configuration saved, but automatic restart failed. Check the service restart permissions." )
            return jsonify(config=config, revision=revision(content), restartScheduled=True,
                           restartRequired=False)
    except (ValueError, TypeError):
        # Validation errors contain field names only; never echo configuration values.
        if request.method == "PUT":
            return jsonify(error="Invalid configuration. Check section types, database port, positive limits, engines and SVG mappings."), 400
        return jsonify(error="Unable to read configuration JSON."), 500
    except OSError:
        current_app.logger.exception("Unable to access backend configuration")
        return jsonify(error="Unable to read or save configuration. Check server file permissions."), 500
