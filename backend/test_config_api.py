import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from flask import Flask

import config_api
from auth_api import _build_token


class ConfigApiTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "backend_config.json"
        self.original = config_api.CONFIG_PATH.read_bytes()
        self.path.write_bytes(self.original)
        self.path_patch = patch.object(config_api, "CONFIG_PATH", self.path)
        self.path_patch.start()
        self.users_patch = patch.object(config_api, "list_users", return_value=[{"username": "admin", "role": "admin"}])
        self.users_patch.start()
        self.app = Flask(__name__)
        self.app.config.update(TESTING=True, SECRET_KEY="test-only-secret")
        self.app.register_blueprint(config_api.config_api)
        self.client = self.app.test_client()
        self.url = "/api/admin/backend-config"

    def tearDown(self):
        self.users_patch.stop()
        self.path_patch.stop()
        self.directory.cleanup()

    def headers(self, role="admin", username="admin"):
        with self.app.app_context():
            return {"Authorization": "Bearer " + _build_token({"username": username, "role": role})}

    def test_access_control(self):
        for method in (self.client.get, self.client.put):
            self.assertEqual(method(self.url).status_code, 401)
            self.assertEqual(method(self.url, headers={"Authorization": "Bearer invalid"}).status_code, 401)
            self.assertEqual(method(self.url, headers=self.headers("user")).status_code, 403)
            self.assertEqual(method(self.url, headers=self.headers(username="deleted-admin")).status_code, 403)
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_read_save_and_conflict(self):
        response = self.client.get(self.url, headers=self.headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        payload = response.get_json()
        payload["config"]["overview_trend"]["max_points_per_series"] = 400
        saved = self.client.put(self.url, headers=self.headers(), json=payload)
        self.assertEqual(saved.status_code, 200, saved.get_json())
        self.assertTrue(saved.get_json()["restartRequired"])
        self.assertEqual(json.loads(self.path.read_bytes())["overview_trend"]["max_points_per_series"], 400)
        self.assertEqual(self.client.put(self.url, headers=self.headers(), json=payload).status_code, 409)

    def test_invalid_config_preserves_file(self):
        payload = self.client.get(self.url, headers=self.headers()).get_json()
        cases = [[], {}, {**payload["config"], "vessels": []}]
        bad_port = copy.deepcopy(payload["config"])
        bad_port["database_connection"]["port"] = -1
        cases.append(bad_port)
        for config in cases:
            response = self.client.put(self.url, headers=self.headers(), json={**payload, "config": config})
            self.assertEqual(response.status_code, 400)
            self.assertEqual(self.path.read_bytes(), self.original)

    def test_write_failure_preserves_file(self):
        payload = self.client.get(self.url, headers=self.headers()).get_json()
        with patch.object(config_api.os, "replace", side_effect=OSError("test write failure")):
            response = self.client.put(self.url, headers=self.headers(), json=payload)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(self.path.read_bytes(), self.original)
        self.assertEqual(list(self.path.parent.iterdir()), [self.path])


if __name__ == "__main__":
    unittest.main()
