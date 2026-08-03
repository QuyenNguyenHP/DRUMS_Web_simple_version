from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from database_api_engine import engine_api
from database_api_overview import overview_api


app = Flask(__name__)
CORS(app)

app.register_blueprint(overview_api)
app.register_blueprint(engine_api)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=True)
