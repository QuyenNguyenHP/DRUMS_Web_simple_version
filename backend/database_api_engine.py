from __future__ import annotations

import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import Blueprint, jsonify, request
from engine_mapping_config import get_engine_svg_mapping

from database_api_overview import (
    LATEST_TIMESTAMP_COLUMN,
    MYSQL_CHANNEL_COLUMN,
    MYSQL_SERIAL_COLUMN,
    MYSQL_TIMESTAMP_COLUMN,
    MYSQL_UNIT_COLUMN,
    MYSQL_VALUE_COLUMN,
    create_mysql_connection,
    get_vessel_config,
    get_vessel_engine,
    log_backend_timing,
    quote_mysql_identifier,
)

engine_api = Blueprint("engine_api", __name__)
ENGINE_SNAPSHOT_LOOKBACK_SECONDS = 60
ENGINE_BINDING_LOOKUP_CACHE: dict[tuple[str, str], dict[str, str]] = {}
ENGINE_PAYLOAD_CACHE: dict[tuple[str, str, int | None], dict[str, Any]] = {}


def normalize_engine_channel_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())


def build_engine_binding_lookup(engine_svg_mapping: dict[str, Any] | None) -> dict[str, str]:
    lookup: dict[str, str] = {}

    for element_id, aliases in (engine_svg_mapping or {}).items():
        if not isinstance(aliases, list):
            continue

        for alias in aliases:
            normalized_alias = normalize_engine_channel_name(alias)

            if normalized_alias:
                lookup[normalized_alias] = element_id

    return lookup


def format_engine_timestamp_label(value: datetime | None) -> str:
    if value is None:
        return "Timestamp: --"

    return f"Timestamp: {value.strftime('%Y-%m-%d %H:%M:%S')}"


def format_engine_timestamp_value(value: datetime | None) -> str:
    if value is None:
        return "--"

    return value.strftime("%Y-%m-%d %H:%M:%S")


def map_engine_snapshot_to_svg_values(
    rows: list[dict[str, Any]],
    *,
    engine_binding_lookup: dict[str, str],
    engine_label: str,
    latest_timestamp: datetime | None,
) -> tuple[dict[str, Any], list[str], list[str]]:
    values: dict[str, Any] = {
        "engine_label": engine_label or "--",
        "timestamp_text": format_engine_timestamp_value(latest_timestamp),
    }
    matched_ids: set[str] = set()
    unmatched_channels: list[str] = []

    for row in rows:
        channel_description = str(row.get("channelDescription", "")).strip()
        element_id = engine_binding_lookup.get(
            normalize_engine_channel_name(channel_description)
        )

        if not element_id:
            if channel_description:
                unmatched_channels.append(channel_description)
            continue

        matched_ids.add(element_id)
        raw_value = row.get("value")

        if raw_value is None or raw_value == "":
            values[element_id] = "--"
            continue

        try:
            numeric_value = float(raw_value)
        except (TypeError, ValueError):
            values[element_id] = str(raw_value)
            continue

        values[element_id] = (
            str(int(numeric_value))
            if numeric_value.is_integer()
            else f"{numeric_value:.2f}".rstrip("0").rstrip(".")
        )

    return values, sorted(matched_ids), unmatched_channels


def build_engine_payload(vessel: str, engine_key: str) -> dict[str, Any]:
    vessel_config = get_vessel_config(vessel)
    engine = get_vessel_engine(vessel_config, engine_key)
    engine_svg_mapping = get_engine_svg_mapping(vessel_config, engine)
    binding_cache_key = (vessel, engine_key)
    engine_binding_lookup = ENGINE_BINDING_LOOKUP_CACHE.get(binding_cache_key)

    if engine_binding_lookup is None:
        engine_binding_lookup = build_engine_binding_lookup(
            engine_svg_mapping
        )
        ENGINE_BINDING_LOOKUP_CACHE[binding_cache_key] = engine_binding_lookup

    data_table = vessel_config.get("data_table")
    latest_data_table = vessel_config.get("latest_data_table")
    ship_name = str(vessel_config.get("ship_name", "")).strip()

    if not latest_data_table:
        raise ValueError(f"Vessel {vessel} is missing latest_data_table configuration.")

    latest_data_timestamp_ms = None
    latest_data_timestamp = None
    snapshot_timestamp_ms = None
    snapshot_timestamp = None
    snapshot_rows: list[dict[str, Any]] = []

    if data_table:
        quoted_data_table = quote_mysql_identifier(data_table)
        quoted_latest_data_table = quote_mysql_identifier(latest_data_table)
        quoted_latest_timestamp_column = quote_mysql_identifier(LATEST_TIMESTAMP_COLUMN)
        quoted_serial_column = quote_mysql_identifier(MYSQL_SERIAL_COLUMN)
        quoted_timestamp_column = quote_mysql_identifier(MYSQL_TIMESTAMP_COLUMN)
        quoted_channel_column = quote_mysql_identifier(MYSQL_CHANNEL_COLUMN)
        quoted_value_column = quote_mysql_identifier(MYSQL_VALUE_COLUMN)
        quoted_unit_column = quote_mysql_identifier(MYSQL_UNIT_COLUMN)

        with create_mysql_connection(vessel_config["database"]) as connection:
            with connection.cursor() as cursor:
                latest_timestamp_query = f"""
                    SELECT MAX({quoted_latest_timestamp_column}) AS latestTimestamp
                    FROM {quoted_latest_data_table}
                """
                latest_timestamp_params: tuple[str, ...] = ()

                if ship_name:
                    latest_timestamp_query += "\n                    WHERE `ShipName` = %s"
                    latest_timestamp_params = (ship_name,)

                cursor.execute(latest_timestamp_query, latest_timestamp_params)
                latest_row = cursor.fetchone() or {}
                latest_data_timestamp = latest_row.get("latestTimestamp")

                if latest_data_timestamp is not None:
                    latest_data_timestamp_ms = int(
                        latest_data_timestamp.replace(tzinfo=timezone.utc).timestamp() * 1000
                    )
                    cache_key = (vessel, engine_key, latest_data_timestamp_ms)
                    cached_payload = ENGINE_PAYLOAD_CACHE.get(cache_key)

                    if cached_payload is not None:
                        return cached_payload

                    # Point lookups avoid a full history scan when an engine trails last_ts.
                    timestamp_candidates = [
                        latest_data_timestamp - timedelta(seconds=offset)
                        for offset in range(ENGINE_SNAPSHOT_LOOKBACK_SECONDS + 1)
                    ]
                    timestamp_placeholders = ", ".join(
                        ["%s"] * len(timestamp_candidates)
                    )
                    cursor.execute(
                        f"""
                        SELECT {quoted_timestamp_column} AS snapshotTimestamp
                        FROM {quoted_data_table}
                        WHERE {quoted_serial_column} = %s
                          AND {quoted_timestamp_column} IN ({timestamp_placeholders})
                        ORDER BY {quoted_timestamp_column} DESC
                        LIMIT 1
                        """,
                        (
                            engine.get("serialNo", ""),
                            *timestamp_candidates,
                        ),
                    )
                    snapshot_row = cursor.fetchone() or {}
                    snapshot_timestamp = snapshot_row.get("snapshotTimestamp")

                    if snapshot_timestamp is not None:
                        snapshot_timestamp_ms = int(
                            snapshot_timestamp.replace(tzinfo=timezone.utc).timestamp() * 1000
                        )

                if snapshot_timestamp is not None:
                    cursor.execute(
                        f"""
                        SELECT
                            {quoted_channel_column} AS channelDescription,
                            {quoted_value_column} AS value,
                            COALESCE({quoted_unit_column}, '') AS unit
                        FROM {quoted_data_table}
                        WHERE {quoted_serial_column} = %s
                          AND {quoted_timestamp_column} = %s
                        ORDER BY {quoted_channel_column}
                        """,
                        (
                            engine.get("serialNo", ""),
                            snapshot_timestamp,
                        ),
                    )
                    snapshot_rows = cursor.fetchall()

    values, matched_element_ids, unmatched_channels = map_engine_snapshot_to_svg_values(
        snapshot_rows,
        engine_binding_lookup=engine_binding_lookup,
        engine_label=engine.get("label", engine_key),
        latest_timestamp=snapshot_timestamp,
    )
    # Clear vessel fields not supported by this engine instead of leaving SVG samples.
    for configured_element_id in set(vessel_config.get("engine_svg_mapping") or {}) | set(engine_svg_mapping):
        values.setdefault(configured_element_id, "--")

    payload = {
        "page": "engine",
        "values": values,
        "records": snapshot_rows,
        "channels": {
            element_id: {
                "channelDescription": row["channelDescription"],
                "unit": row.get("unit", ""),
            }
            for row in snapshot_rows
            if (element_id := engine_binding_lookup.get(
                normalize_engine_channel_name(row.get("channelDescription", ""))
            ))
        },
        "meta": {
            "pollIntervalMs": 2000,
            "vessel": {
                "key": vessel,
                "label": vessel_config.get("label", vessel),
                "database": vessel_config.get("database", ""),
                "dataTable": data_table or "",
                "latestDataTable": latest_data_table or "",
            },
            "engine": {
                "key": engine.get("key", ""),
                "label": engine.get("label", engine_key),
                "serialNo": engine.get("serialNo", ""),
            },
            "latestTimestampMs": snapshot_timestamp_ms,
            "latestTimestampLabel": format_engine_timestamp_label(snapshot_timestamp),
            "latestDataTimestampMs": latest_data_timestamp_ms,
            "latestDataTimestampLabel": format_engine_timestamp_label(
                latest_data_timestamp
            ),
            "matchedElementIds": matched_element_ids,
            "matchedElementCount": len(matched_element_ids),
            "configuredElementCount": sum(bool(aliases) for aliases in engine_svg_mapping.values()),
            "snapshotRecordCount": len(snapshot_rows),
            "unmatchedChannels": unmatched_channels,
        },
    }

    stale_cache_keys = [
        key
        for key in ENGINE_PAYLOAD_CACHE
        if key[:2] == (vessel, engine_key) and key[2] != latest_data_timestamp_ms
    ]
    for stale_cache_key in stale_cache_keys:
        del ENGINE_PAYLOAD_CACHE[stale_cache_key]

    ENGINE_PAYLOAD_CACHE[(vessel, engine_key, latest_data_timestamp_ms)] = payload
    return payload


@engine_api.get("/api/engine")
def get_engine_route() -> Any:
    request_started = time.perf_counter()
    try:
        vessel = request.args.get("vessel", default="", type=str).strip()
        engine_key = request.args.get("engine", default="", type=str).strip()

        if not vessel:
            raise ValueError("vessel is required.")

        if not engine_key:
            raise ValueError("engine is required.")

        payload = build_engine_payload(vessel, engine_key)
        serialize_started = time.perf_counter()
        response = jsonify(payload)
        log_backend_timing(
            "/api/engine",
            status_code=200,
            total_start=request_started,
            serialize_start=serialize_started,
            vessel=vessel,
            engine=engine_key,
        )
        return response
    except ValueError as exc:
        log_backend_timing(
            "/api/engine",
            status_code=400,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        log_backend_timing(
            "/api/engine",
            status_code=500,
            total_start=request_started,
            error=str(exc),
        )
        return jsonify({"error": str(exc)}), 500
