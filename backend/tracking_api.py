"""OpenWaters-backed vessel tracking stored inside the DRUMS project."""
import json
import math
import os
import tempfile
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Blueprint, jsonify

tracking_api = Blueprint("tracking", __name__)

CONFIG_PATH = Path(
    os.environ.get(
        "VESSEL_TRACKING_CONFIG",
        str(Path(__file__).resolve().parent / "vessel_tracking_config.json"),
    )
)
OPENWATERS_API_BASE_URL = os.environ.get(
    "OPENWATERS_API_BASE_URL", "https://ais.openwaters.io/v1"
).rstrip("/")
POLL_SECONDS = 300
BATCH_SIZE = 6
_UPDATE_LOCK = threading.Lock()


def load_tracking_config():
    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    vessels = data.get("vessels") if isinstance(data, dict) else None
    if not isinstance(vessels, list):
        raise ValueError("vessel_tracking_config.json must contain a vessels array")
    seen = set()
    for vessel in vessels:
        mmsi = vessel.get("mmsi") if isinstance(vessel, dict) else None
        if not isinstance(mmsi, str) or len(mmsi) != 9 or not mmsi.isascii() or not mmsi.isdigit():
            raise ValueError("Each vessel requires a nine-digit MMSI string")
        if mmsi in seen:
            raise ValueError("Duplicate MMSI in vessel tracking configuration")
        seen.add(mmsi)
    return data


def save_tracking_config(data):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=CONFIG_PATH.parent, delete=False
        ) as stream:
            temporary = stream.name
            json.dump(data, stream, indent=2, ensure_ascii=False, allow_nan=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, CONFIG_PATH)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def _last_poll_is_fresh(data):
    value = data.get("last_poll_at")
    if not value:
        return False
    try:
        last_poll = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return datetime.now(timezone.utc) - last_poll < timedelta(seconds=POLL_SECONDS)


def refresh_positions(force=False):
    with _UPDATE_LOCK:
        data = load_tracking_config()
        if not force and _last_poll_is_fresh(data):
            return data

        enabled = {
            vessel["mmsi"]
            for vessel in data["vessels"]
            if vessel.get("enabled", True)
        }
        positions = {}
        mmsis = sorted(enabled)
        for offset in range(0, len(mmsis), BATCH_SIZE):
            batch = mmsis[offset : offset + BATCH_SIZE]
            request = Request(
                f"{OPENWATERS_API_BASE_URL}/vessels?"
                + urlencode({"mmsi": ",".join(batch)}),
                headers={"Accept": "application/geo+json, application/json"},
            )
            with urlopen(request, timeout=20) as response:
                payload = json.load(response)
            for feature in payload.get("features", []):
                properties = feature.get("properties") or {}
                coordinates = (feature.get("geometry") or {}).get("coordinates") or []
                mmsi = str(properties.get("mmsi", ""))
                if mmsi not in enabled or len(coordinates) < 2:
                    continue
                longitude, latitude = coordinates[:2]
                values = (latitude, longitude)
                if any(
                    isinstance(item, bool)
                    or not isinstance(item, (int, float))
                    or not math.isfinite(item)
                    for item in values
                ):
                    continue
                if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
                    continue
                positions[mmsi] = {
                    "latitude": latitude,
                    "longitude": longitude,
                    "speed": properties.get("sog"),
                    "course": properties.get("cog"),
                    "timestamp": properties.get("seen"),
                    "provider": "OpenWaters",
                }

        now = datetime.now(timezone.utc).isoformat()
        data = load_tracking_config()
        for vessel in data["vessels"]:
            if vessel["mmsi"] not in enabled or not vessel.get("enabled", True):
                continue
            vessel["last_checked_at"] = now
            if vessel["mmsi"] in positions:
                vessel["position"] = {
                    **positions[vessel["mmsi"]],
                    "received_at": now,
                }
        data["last_poll_at"] = now
        save_tracking_config(data)
        return data


def vessel_response(vessel):
    position = vessel.get("position") or {}
    return {
        **vessel,
        **position,
        "provider": position.get("provider", "OpenWaters"),
        "position_available": (
            position.get("latitude") is not None
            and position.get("longitude") is not None
        ),
    }


@tracking_api.get("/api/tracking/vessels")
def tracking_vessels():
    try:
        try:
            data = refresh_positions()
        except (OSError, TimeoutError, ValueError, json.JSONDecodeError):
            data = load_tracking_config()
        return jsonify(
            [
                vessel_response(vessel)
                for vessel in data["vessels"]
                if vessel.get("enabled", True)
            ]
        )
    except (OSError, ValueError, json.JSONDecodeError):
        return jsonify(error="Vessel tracking configuration is unavailable or invalid."), 502
