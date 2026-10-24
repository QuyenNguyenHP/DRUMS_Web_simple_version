"""Read-through adapter for the existing VesselTrackingMap service."""
import json
import os
from urllib.error import URLError
from urllib.request import urlopen

from flask import Blueprint, jsonify

tracking_api = Blueprint("tracking", __name__)


@tracking_api.get("/api/tracking/vessels")
def tracking_vessels():
    base_url = os.environ.get("VESSEL_TRACKING_URL", "http://127.0.0.1:8011").rstrip("/")
    try:
        with urlopen(f"{base_url}/api/vessels", timeout=10) as response:
            vessels = json.load(response)
        if not isinstance(vessels, list) or any(not isinstance(v, dict) or not v.get("mmsi") for v in vessels):
            raise ValueError("Invalid vessel data")
        return jsonify(vessels)
    except (URLError, TimeoutError, OSError, ValueError):
        return jsonify(error="Vessel tracking service unavailable. Start VesselTrackingMap or check VESSEL_TRACKING_URL."), 502
