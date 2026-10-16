import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import session_secret


class SessionSecretTests(unittest.TestCase):
    def test_secret_survives_reload(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(session_secret, "__file__", str(Path(directory) / "session_secret.py")):
                with patch.dict(os.environ, {}, clear=True):
                    first = session_secret.load_session_secret()
                    self.assertEqual(len(first), 64)
                    self.assertEqual(first, session_secret.load_session_secret())

    def test_existing_environment_secret_is_preserved(self):
        with patch.dict(os.environ, {"DRUMS_SECRET_KEY": "existing-deployment-key"}):
            self.assertEqual(session_secret.load_session_secret(), "existing-deployment-key")
