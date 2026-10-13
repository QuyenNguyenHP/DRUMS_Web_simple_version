from __future__ import annotations

import os
import secrets

from flask import Flask
from flask_cors import CORS

from auth_api import auth_api
from config_api import config_api
from database_api_engine import engine_api
from database_api_overview import overview_api


app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("DRUMS_SECRET_KEY") or secrets.token_hex(32)
CORS(app, allow_headers=["Content-Type", "Authorization"])

app.register_blueprint(auth_api)
app.register_blueprint(config_api)
app.register_blueprint(overview_api)
app.register_blueprint(engine_api)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=True)
