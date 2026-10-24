import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from flask import Flask
import tracking_api


class TrackingApiTests(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.register_blueprint(tracking_api.tracking_api)
        self.client = app.test_client()
        self.temp = tempfile.TemporaryDirectory()
        self.config_path = Path(self.temp.name) / "vessel_tracking_config.json"
        self.config_path.write_text(
            json.dumps(
                {
                    "vessels": [
                        {
                            "imo": "1234567",
                            "mmsi": "123456789",
                            "name": "TEST VESSEL",
                            "enabled": True,
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )
        self.path_patch = patch.object(tracking_api, "CONFIG_PATH", self.config_path)
        self.path_patch.start()

    def tearDown(self):
        self.path_patch.stop()
        self.temp.cleanup()

    @patch("tracking_api.urlopen")
    def test_fetches_and_saves_openwaters_position(self, request):
        payload = {
            "features": [
                {
                    "geometry": {"coordinates": [103.8, 1.3]},
                    "properties": {
                        "mmsi": 123456789,
                        "sog": 12.5,
                        "cog": 290.3,
                        "seen": "2026-10-24T00:00:00Z",
                    },
                }
            ]
        }
        request.return_value = io.BytesIO(json.dumps(payload).encode())
        response = self.client.get("/api/tracking/vessels")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json[0]["latitude"], 1.3)
        self.assertEqual(response.json[0]["course"], 290.3)
        saved = json.loads(self.config_path.read_text(encoding="utf-8"))
        self.assertEqual(saved["vessels"][0]["position"]["longitude"], 103.8)

    @patch("tracking_api.urlopen", side_effect=OSError("offline"))
    def test_returns_saved_position_when_openwaters_is_offline(self, request):
        data = json.loads(self.config_path.read_text(encoding="utf-8"))
        data["vessels"][0]["position"] = {
            "latitude": 1.2,
            "longitude": 103.7,
            "provider": "OpenWaters",
        }
        self.config_path.write_text(json.dumps(data), encoding="utf-8")
        response = self.client.get("/api/tracking/vessels")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json[0]["latitude"], 1.2)

    def test_invalid_config_returns_502(self):
        self.config_path.write_text("{}", encoding="utf-8")
        response = self.client.get("/api/tracking/vessels")
        self.assertEqual(response.status_code, 502)


if __name__ == "__main__":
    unittest.main()
