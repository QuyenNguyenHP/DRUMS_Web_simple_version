import io
import unittest
from unittest.mock import patch
from urllib.error import URLError

from flask import Flask
from tracking_api import tracking_api


class TrackingApiTests(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.register_blueprint(tracking_api)
        self.client = app.test_client()

    @patch("tracking_api.urlopen")
    def test_returns_saved_positions_without_modification(self, request):
        request.return_value = io.BytesIO(b'[{"mmsi":"123456789","latitude":0,"longitude":0}]')
        response = self.client.get("/api/tracking/vessels")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json[0]["latitude"], 0)

    @patch("tracking_api.urlopen", side_effect=URLError("offline"))
    def test_service_unavailable(self, request):
        response = self.client.get("/api/tracking/vessels")
        self.assertEqual(response.status_code, 502)
        self.assertIn("unavailable", response.json["error"])

    @patch("tracking_api.urlopen")
    def test_invalid_payload(self, request):
        for body in (b'{}', b'not json', b'[null]', b'[{"name":"Missing MMSI"}]'):
            request.return_value = io.BytesIO(body)
            self.assertEqual(self.client.get("/api/tracking/vessels").status_code, 502)

    @patch("tracking_api.urlopen")
    def test_empty_fleet(self, request):
        request.return_value = io.BytesIO(b'[]')
        response = self.client.get("/api/tracking/vessels")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, [])


if __name__ == "__main__":
    unittest.main()
