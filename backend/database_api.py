from __future__ import annotations

import json
import logging
import re
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pymysql
from flask import Blueprint, jsonify, request

database_api = Blueprint("database_api", __name__)
BASE_DIR = Path(__file__).resolve().parent
IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")
LOGGER = logging.getLogger(__name__)


def load_json_config(file_name: str) -> dict[str, Any]:
    with (BASE_DIR / file_name).open("r", encoding="utf-8") as config_file:
        return json.load(config_file)


CONFIG = load_json_config("backend_config.json")
DATABASE_CONNECTION_CONFIG = CONFIG.get("database_connection", {})
HISTORY_CONFIG = CONFIG.get("history_trend", {})
OVERVIEW_CONFIG = CONFIG.get("overview_trend", {})


def resolve_database_path(relative_path: str) -> Path:
    return (BASE_DIR / relative_path).resolve()


SQLITE_DATABASE_PATH = resolve_database_path(
    HISTORY_CONFIG.get("database_path", "database/template.db")
)
SQLITE_TABLE_NAME = HISTORY_CONFIG.get("table_name", "trend_history").replace('"', '""')
SQLITE_TIMESTAMP_COLUMN = HISTORY_CONFIG.get("timestamp_column", "timestamp_utc").replace(
    '"', '""'
)
SQLITE_SERIES_KEY_COLUMN = HISTORY_CONFIG.get("series_key_column", "series_key").replace(
    '"', '""'
)
SQLITE_SERIES_LABEL_COLUMN = HISTORY_CONFIG.get(
    "series_label_column", "series_label"
).replace('"', '""')
SQLITE_VALUE_COLUMN = HISTORY_CONFIG.get("value_column", "value").replace('"', '""')
SQLITE_UNIT_COLUMN = HISTORY_CONFIG.get("unit_column", "unit").replace('"', '""')
DEFAULT_WINDOW_MINUTES = int(HISTORY_CONFIG.get("default_window_minutes", 240))
DEFAULT_SERIES = HISTORY_CONFIG.get("default_series", [])

DEFAULT_OVERVIEW_WINDOW_HOURS = int(OVERVIEW_CONFIG.get("default_window_hours", 24))
MAX_OVERVIEW_RANGE_DAYS = int(OVERVIEW_CONFIG.get("max_range_days", 7))
MAX_OVERVIEW_POINTS_PER_SERIES = int(OVERVIEW_CONFIG.get("max_points_per_series", 350))
MYSQL_TIMESTAMP_COLUMN = OVERVIEW_CONFIG.get("timestamp_column", "TimeStamp")
MYSQL_SERIAL_COLUMN = OVERVIEW_CONFIG.get("serial_column", "SerialNo")
MYSQL_CHANNEL_COLUMN = OVERVIEW_CONFIG.get("channel_column", "ChannelDescription")
MYSQL_VALUE_COLUMN = OVERVIEW_CONFIG.get("value_column", "Value")
MYSQL_UNIT_COLUMN = OVERVIEW_CONFIG.get("unit_column", "Unit")
CHANNEL_FILTER_UNIT_EXCLUDE = str(
    OVERVIEW_CONFIG.get("channel_filter_unit_exclude", "On/Off")
).strip()
VESSEL_CONFIGS = OVERVIEW_CONFIG.get("vessels", {})


def quote_sqlite_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def quote_mysql_identifier(identifier: str) -> str:
    if not IDENTIFIER_PATTERN.fullmatch(identifier):
        raise ValueError(f"Invalid identifier: {identifier}")
    return f"`{identifier}`"


def duration_ms(start_time: float) -> float:
    return round((time.perf_counter() - start_time) * 1000, 2)


def log_backend_timing(
    endpoint: str,
    *,
    status_code: int,
    total_start: float,
    serialize_start: float | None = None,
    **fields: Any,
) -> None:
    payload = {
        "endpoint": endpoint,
        "status_code": status_code,
        "total_ms": duration_ms(total_start),
    }

    if serialize_start is not None:
        payload["serialize_ms"] = duration_ms(serialize_start)

    payload.update(fields)
    LOGGER.info("backend_timing %s", json.dumps(payload, default=str, ensure_ascii=True))


def validate_absolute_range(start_time: str | None, end_time: str | None) -> None:
    if (start_time and not end_time) or (end_time and not start_time):
        raise ValueError("Both startTime and endTime are required when using an absolute range.")


def resolve_sqlite_history_range(
    connection: sqlite3.Connection,
    window_minutes: int | None,
    start_time: str | None,
    end_time: str | None,
) -> sqlite3.Row:
    quoted_table = quote_sqlite_identifier(SQLITE_TABLE_NAME)
    quoted_timestamp_column = quote_sqlite_identifier(SQLITE_TIMESTAMP_COLUMN)

    if start_time and end_time:
        return connection.execute(
            """
            SELECT
                CAST(unixepoch(MIN(datetime(?, 'utc'), datetime(?, 'utc'))) * 1000 AS INTEGER) AS rangeStartMs,
                CAST(unixepoch(MAX(datetime(?, 'utc'), datetime(?, 'utc'))) * 1000 AS INTEGER) AS rangeEndMs
            """,
            (start_time, end_time, start_time, end_time),
        ).fetchone()

    minutes = max(1, int(window_minutes or DEFAULT_WINDOW_MINUTES))
    return connection.execute(
        f"""
        SELECT
            CAST(unixepoch(MAX({quoted_timestamp_column}), '-{minutes} minutes') * 1000 AS INTEGER) AS rangeStartMs,
            CAST(unixepoch(MAX({quoted_timestamp_column})) * 1000 AS INTEGER) AS rangeEndMs
        FROM {quoted_table}
        """
    ).fetchone()


def build_history_payload(
    window_minutes: int | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
    series_keys: list[str] | None = None,
) -> dict[str, Any]:
    if not SQLITE_DATABASE_PATH.exists():
        raise FileNotFoundError(
            f"Trend database not found: {SQLITE_DATABASE_PATH}. Read backend/database/README.md first."
        )

    validate_absolute_range(start_time, end_time)

    with sqlite3.connect(SQLITE_DATABASE_PATH) as connection:
        connection.row_factory = sqlite3.Row
        range_row = resolve_sqlite_history_range(
            connection, window_minutes, start_time, end_time
        )

        resolved_series_keys = [
            series_key for series_key in (series_keys or DEFAULT_SERIES) if series_key
        ]

        if not resolved_series_keys:
            raise ValueError("No seriesKey values configured. Update backend_config.json.")

        placeholders = ", ".join(["?"] * len(resolved_series_keys))
        quoted_table = quote_sqlite_identifier(SQLITE_TABLE_NAME)
        quoted_timestamp_column = quote_sqlite_identifier(SQLITE_TIMESTAMP_COLUMN)
        quoted_series_key_column = quote_sqlite_identifier(SQLITE_SERIES_KEY_COLUMN)
        quoted_series_label_column = quote_sqlite_identifier(SQLITE_SERIES_LABEL_COLUMN)
        quoted_value_column = quote_sqlite_identifier(SQLITE_VALUE_COLUMN)
        quoted_unit_column = quote_sqlite_identifier(SQLITE_UNIT_COLUMN)

        if start_time and end_time:
            records = connection.execute(
                f"""
                SELECT
                    {quoted_series_key_column} AS seriesKey,
                    {quoted_series_label_column} AS seriesLabel,
                    CAST(unixepoch({quoted_timestamp_column}) * 1000 AS INTEGER) AS timestampMs,
                    strftime('%Y-%m-%d %H:%M:%S', {quoted_timestamp_column}) AS timestampLabel,
                    {quoted_value_column} AS value,
                    COALESCE({quoted_unit_column}, '') AS unit
                FROM {quoted_table}
                WHERE {quoted_series_key_column} IN ({placeholders})
                  AND {quoted_timestamp_column} BETWEEN MIN(datetime(?, 'utc'), datetime(?, 'utc'))
                                                    AND MAX(datetime(?, 'utc'), datetime(?, 'utc'))
                ORDER BY {quoted_timestamp_column}, {quoted_series_key_column}
                """,
                (*resolved_series_keys, start_time, end_time, start_time, end_time),
            ).fetchall()
        else:
            minutes = max(1, int(window_minutes or DEFAULT_WINDOW_MINUTES))
            records = connection.execute(
                f"""
                SELECT
                    {quoted_series_key_column} AS seriesKey,
                    {quoted_series_label_column} AS seriesLabel,
                    CAST(unixepoch({quoted_timestamp_column}) * 1000 AS INTEGER) AS timestampMs,
                    strftime('%Y-%m-%d %H:%M:%S', {quoted_timestamp_column}) AS timestampLabel,
                    {quoted_value_column} AS value,
                    COALESCE({quoted_unit_column}, '') AS unit
                FROM {quoted_table}
                WHERE {quoted_series_key_column} IN ({placeholders})
                  AND {quoted_timestamp_column} BETWEEN datetime(
                        (SELECT MAX({quoted_timestamp_column}) FROM {quoted_table}),
                        '-{minutes} minutes'
                      )
                      AND (SELECT MAX({quoted_timestamp_column}) FROM {quoted_table})
                ORDER BY {quoted_timestamp_column}, {quoted_series_key_column}
                """,
                tuple(resolved_series_keys),
            ).fetchall()

    series = []
    for series_key in resolved_series_keys:
        first_match = next((record for record in records if record["seriesKey"] == series_key), None)
        series.append(
            {
                "key": series_key,
                "label": first_match["seriesLabel"] if first_match else series_key,
                "unit": first_match["unit"] if first_match else "",
            }
        )

    return {
        "page": "history-trend",
        "records": [dict(row) for row in records],
        "meta": {
            "rangeStartMs": range_row["rangeStartMs"],
            "rangeEndMs": range_row["rangeEndMs"],
            "series": series,
        },
    }


def parse_utc_datetime(value: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"Invalid datetime value: {value}") from exc

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc).replace(tzinfo=None)


def get_vessel_config(vessel_key: str) -> dict[str, Any]:
    vessel_config = VESSEL_CONFIGS.get(vessel_key)

    if not vessel_config:
        raise ValueError(f"Unsupported vessel: {vessel_key}")

    if not vessel_config.get("database"):
        raise ValueError(f"Vessel {vessel_key} is not fully configured yet.")

    if not vessel_config.get("channel_table"):
        raise ValueError(f"Vessel {vessel_key} is missing channel_table configuration.")

    if not vessel_config.get("data_table"):
        raise ValueError(f"Vessel {vessel_key} is missing data_table configuration.")

    return vessel_config


def build_overview_vessel_payload() -> dict[str, Any]:
    vessels = []

    for vessel_key, vessel_config in VESSEL_CONFIGS.items():
        vessels.append(
            {
                "value": vessel_key,
                "label": vessel_config.get("label", vessel_key),
                "database": vessel_config.get("database", ""),
                "engines": vessel_config.get("engines", []),
            }
        )

    return {
        "page": "overview-config",
        "vessels": vessels,
        "meta": {
            "count": len(vessels),
        },
    }


def create_mysql_connection(database_name: str) -> pymysql.connections.Connection:
    return pymysql.connect(
        host=DATABASE_CONNECTION_CONFIG["host"],
        port=int(DATABASE_CONNECTION_CONFIG.get("port", 3306)),
        user=DATABASE_CONNECTION_CONFIG["user"],
        password=DATABASE_CONNECTION_CONFIG["password"],
        database=database_name,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        connect_timeout=int(DATABASE_CONNECTION_CONFIG.get("connect_timeout_seconds", 10)),
        read_timeout=int(DATABASE_CONNECTION_CONFIG.get("read_timeout_seconds", 30)),
        write_timeout=int(DATABASE_CONNECTION_CONFIG.get("write_timeout_seconds", 30)),
    )


def validate_vessel_serial(vessel_config: dict[str, Any], serial_no: str) -> None:
    configured_serials = {
        str(engine.get("serialNo", "")).strip()
        for engine in vessel_config.get("engines", [])
        if engine.get("serialNo")
    }

    if configured_serials and serial_no not in configured_serials:
        raise ValueError("serialNo is not configured for the selected vessel.")


def resolve_overview_range(
    cursor: pymysql.cursors.Cursor,
    quoted_data_table: str,
    serial_no: str,
    start_time: str | None,
    end_time: str | None,
) -> tuple[datetime, datetime]:
    if start_time and end_time:
        start_datetime = parse_utc_datetime(start_time)
        end_datetime = parse_utc_datetime(end_time)

        if start_datetime == end_datetime:
            raise ValueError("startTime and endTime must not be identical.")

        if start_datetime > end_datetime:
            start_datetime, end_datetime = end_datetime, start_datetime

        if end_datetime - start_datetime > timedelta(days=MAX_OVERVIEW_RANGE_DAYS):
            raise ValueError(
                f"overview trend range must not exceed {MAX_OVERVIEW_RANGE_DAYS} days."
            )

        return start_datetime, end_datetime

    max_row = cursor.execute(
        f"""
        SELECT MAX({quote_mysql_identifier(MYSQL_TIMESTAMP_COLUMN)}) AS latestTimestamp
        FROM {quoted_data_table}
        WHERE {quote_mysql_identifier(MYSQL_SERIAL_COLUMN)} = %s
        """,
        (serial_no,),
    )

    if max_row == 0:
        raise ValueError("No records found for the selected vessel and engine.")

    latest_row = cursor.fetchone()
    latest_timestamp = latest_row.get("latestTimestamp") if latest_row else None

    if latest_timestamp is None:
        raise ValueError("No timestamp data found for the selected vessel and engine.")

    return latest_timestamp - timedelta(hours=DEFAULT_OVERVIEW_WINDOW_HOURS), latest_timestamp


def build_overview_channel_options(vessel: str, serial_no: str) -> dict[str, Any]:
    build_started = time.perf_counter()
    vessel_config = get_vessel_config(vessel)
    validate_vessel_serial(vessel_config, serial_no)
    quoted_channel_table = quote_mysql_identifier(vessel_config["channel_table"])
    quoted_channel_column = quote_mysql_identifier(MYSQL_CHANNEL_COLUMN)
    quoted_serial_column = quote_mysql_identifier(MYSQL_SERIAL_COLUMN)
    quoted_unit_column = quote_mysql_identifier(MYSQL_UNIT_COLUMN)
    connect_started = time.perf_counter()

    with create_mysql_connection(vessel_config["database"]) as connection:
        connect_ms = duration_ms(connect_started)
        with connection.cursor() as cursor:
            query_started = time.perf_counter()
            cursor.execute(
                f"""
                SELECT DISTINCT
                    {quoted_channel_column} AS channelDescription,
                    COALESCE(NULLIF({quoted_unit_column}, ''), '') AS unit
                FROM {quoted_channel_table}
                WHERE {quoted_serial_column} = %s
                  AND (
                        {quoted_unit_column} IS NULL
                     OR {quoted_unit_column} = ''
                     OR {quoted_unit_column} <> %s
                  )
                ORDER BY {quoted_channel_column}
                """,
                (serial_no, CHANNEL_FILTER_UNIT_EXCLUDE),
            )
            channels = cursor.fetchall()
            query_ms = duration_ms(query_started)

    return {
        "page": "overview-channel-options",
        "vessel": vessel,
        "serialNo": serial_no,
        "channels": channels,
        "meta": {
            "count": len(channels),
            "database": vessel_config["database"],
            "channelTable": vessel_config["channel_table"],
            "timingMs": {
                "build": duration_ms(build_started),
                "dbConnect": connect_ms,
                "dbQuery": query_ms,
            },
        },
    }


def build_overview_trend_payload(
    vessel: str,
    serial_no: str,
    channel_descriptions: list[str],
    start_time: str | None,
    end_time: str | None,
) -> dict[str, Any]:
    build_started = time.perf_counter()
    validate_absolute_range(start_time, end_time)

    if not channel_descriptions:
        raise ValueError("At least one channelDescription is required.")

    vessel_config = get_vessel_config(vessel)
    validate_vessel_serial(vessel_config, serial_no)
    quoted_data_table = quote_mysql_identifier(vessel_config["data_table"])
    channel_placeholders = ", ".join(["%s"] * len(channel_descriptions))
    connect_started = time.perf_counter()

    with create_mysql_connection(vessel_config["database"]) as connection:
        connect_ms = duration_ms(connect_started)
        with connection.cursor() as cursor:
            range_started = time.perf_counter()
            range_start, range_end = resolve_overview_range(
                cursor, quoted_data_table, serial_no, start_time, end_time
            )
            range_query_ms = duration_ms(range_started)
            total_range_seconds = max(
                1,
                int((range_end - range_start).total_seconds()),
            )
            target_bucket_count = max(1, MAX_OVERVIEW_POINTS_PER_SERIES // 2)
            bucket_seconds = max(
                1,
                (total_range_seconds + target_bucket_count - 1) // target_bucket_count,
            )

            query_started = time.perf_counter()
            cursor.execute(
                f"""
                WITH filtered_records AS (
                    SELECT
                        {quote_mysql_identifier(MYSQL_CHANNEL_COLUMN)} AS channelDescription,
                        {quote_mysql_identifier(MYSQL_TIMESTAMP_COLUMN)} AS eventTimestamp,
                        CAST(NULLIF(TRIM({quote_mysql_identifier(MYSQL_VALUE_COLUMN)}), '') AS DOUBLE) AS value,
                        FLOOR(
                            TIMESTAMPDIFF(
                                SECOND,
                                %s,
                                {quote_mysql_identifier(MYSQL_TIMESTAMP_COLUMN)}
                            ) / %s
                        ) AS bucketId
                    FROM {quoted_data_table}
                    WHERE {quote_mysql_identifier(MYSQL_SERIAL_COLUMN)} = %s
                      AND {quote_mysql_identifier(MYSQL_CHANNEL_COLUMN)} IN ({channel_placeholders})
                      AND {quote_mysql_identifier(MYSQL_TIMESTAMP_COLUMN)} BETWEEN %s AND %s
                ),
                bucket_edges AS (
                    SELECT
                        channelDescription,
                        bucketId,
                        MIN(eventTimestamp) AS firstTimestamp,
                        MAX(eventTimestamp) AS lastTimestamp
                    FROM filtered_records
                    GROUP BY channelDescription, bucketId
                )
                SELECT DISTINCT
                    records.channelDescription,
                    CAST(UNIX_TIMESTAMP(records.eventTimestamp) * 1000 AS SIGNED) AS timestampMs,
                    DATE_FORMAT(records.eventTimestamp, '%%Y-%%m-%%d %%H:%%i:%%s') AS timestampLabel,
                    records.value AS value
                FROM filtered_records AS records
                INNER JOIN bucket_edges AS edges
                    ON edges.channelDescription = records.channelDescription
                   AND edges.bucketId = records.bucketId
                   AND (
                        records.eventTimestamp = edges.firstTimestamp
                     OR records.eventTimestamp = edges.lastTimestamp
                   )
                ORDER BY timestampMs, channelDescription
                """,
                (
                    range_start,
                    bucket_seconds,
                    serial_no,
                    *channel_descriptions,
                    range_start,
                    range_end,
                ),
            )
            records = cursor.fetchall()
            query_ms = duration_ms(query_started)

    return {
        "page": "overview-trend",
        "vessel": vessel,
        "serialNo": serial_no,
        "records": records,
        "meta": {
            "database": vessel_config["database"],
            "dataTable": vessel_config["data_table"],
            "rangeStartMs": int(range_start.replace(tzinfo=timezone.utc).timestamp() * 1000),
            "rangeEndMs": int(range_end.replace(tzinfo=timezone.utc).timestamp() * 1000),
            "channelDescriptions": channel_descriptions,
            "maxPointsPerSeries": MAX_OVERVIEW_POINTS_PER_SERIES,
            "targetBucketCount": target_bucket_count,
            "bucketSeconds": bucket_seconds,
            "samplingMode": "first_last_per_bucket",
            "timingMs": {
                "build": duration_ms(build_started),
                "dbConnect": connect_ms,
                "resolveRange": range_query_ms,
                "dbQuery": query_ms,
            },
        },
    }


@database_api.get("/api/history/trend")
def get_history_trend_route() -> Any:
    request_started = time.perf_counter()
    try:
        payload = build_history_payload(
            window_minutes=request.args.get(
                "windowMinutes", default=DEFAULT_WINDOW_MINUTES, type=int
            ),
            start_time=request.args.get("startTime", default=None, type=str),
            end_time=request.args.get("endTime", default=None, type=str),
            series_keys=request.args.getlist("seriesKey"),
        )
        serialize_started = time.perf_counter()
        response = jsonify(payload)
        log_backend_timing(
            "/api/history/trend",
            status_code=200,
            total_start=request_started,
            serialize_start=serialize_started,
            record_count=len(payload.get("records", [])),
            series_count=len(payload.get("meta", {}).get("series", [])),
        )
        return response
    except ValueError as exc:
        log_backend_timing(
            "/api/history/trend",
            status_code=400,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        log_backend_timing(
            "/api/history/trend",
            status_code=500,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 500


@database_api.get("/api/overview/config")
def get_overview_config_route() -> Any:
    request_started = time.perf_counter()
    try:
        payload = build_overview_vessel_payload()
        serialize_started = time.perf_counter()
        response = jsonify(payload)
        log_backend_timing(
            "/api/overview/config",
            status_code=200,
            total_start=request_started,
            serialize_start=serialize_started,
            vessel_count=payload.get("meta", {}).get("count", 0),
        )
        return response
    except ValueError as exc:
        log_backend_timing(
            "/api/overview/config",
            status_code=400,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        log_backend_timing(
            "/api/overview/config",
            status_code=500,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 500


@database_api.get("/api/overview/channel-options")
def get_overview_channel_options_route() -> Any:
    request_started = time.perf_counter()
    try:
        vessel = request.args.get("vessel", default="", type=str).strip()
        serial_no = request.args.get("serialNo", default="", type=str).strip()

        if not vessel:
            raise ValueError("vessel is required.")

        if not serial_no:
            raise ValueError("serialNo is required.")

        payload = build_overview_channel_options(vessel=vessel, serial_no=serial_no)
        serialize_started = time.perf_counter()
        response = jsonify(payload)
        timing_meta = payload.get("meta", {}).get("timingMs", {})
        log_backend_timing(
            "/api/overview/channel-options",
            status_code=200,
            total_start=request_started,
            serialize_start=serialize_started,
            vessel=vessel,
            serial_no=serial_no,
            channel_count=payload.get("meta", {}).get("count", 0),
            db_connect_ms=timing_meta.get("dbConnect"),
            db_query_ms=timing_meta.get("dbQuery"),
            build_ms=timing_meta.get("build"),
        )
        return response
    except ValueError as exc:
        log_backend_timing(
            "/api/overview/channel-options",
            status_code=400,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        log_backend_timing(
            "/api/overview/channel-options",
            status_code=500,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 500


@database_api.get("/api/overview/trend")
def get_overview_trend_route() -> Any:
    request_started = time.perf_counter()
    try:
        vessel = request.args.get("vessel", default="", type=str).strip()
        serial_no = request.args.get("serialNo", default="", type=str).strip()
        channel_descriptions = [
            value.strip()
            for value in request.args.getlist("channelDescription")
            if value and value.strip()
        ]

        if not vessel:
            raise ValueError("vessel is required.")

        if not serial_no:
            raise ValueError("serialNo is required.")

        payload = build_overview_trend_payload(
            vessel=vessel,
            serial_no=serial_no,
            channel_descriptions=channel_descriptions,
            start_time=request.args.get("startTime", default=None, type=str),
            end_time=request.args.get("endTime", default=None, type=str),
        )
        serialize_started = time.perf_counter()
        response = jsonify(payload)
        timing_meta = payload.get("meta", {}).get("timingMs", {})
        log_backend_timing(
            "/api/overview/trend",
            status_code=200,
            total_start=request_started,
            serialize_start=serialize_started,
            vessel=vessel,
            serial_no=serial_no,
            channel_count=len(channel_descriptions),
            record_count=len(payload.get("records", [])),
            bucket_seconds=payload.get("meta", {}).get("bucketSeconds"),
            db_connect_ms=timing_meta.get("dbConnect"),
            resolve_range_ms=timing_meta.get("resolveRange"),
            db_query_ms=timing_meta.get("dbQuery"),
            build_ms=timing_meta.get("build"),
        )
        return response
    except ValueError as exc:
        log_backend_timing(
            "/api/overview/trend",
            status_code=400,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        log_backend_timing(
            "/api/overview/trend",
            status_code=500,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 500
