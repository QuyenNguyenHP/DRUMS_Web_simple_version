Place your SQLite database file here.

The default template expects:

- file path: `backend/database/template.db`
- table: `trend_history`

Expected columns:

- `timestamp_utc` as a SQLite datetime-compatible text column
- `series_key`
- `series_label`
- `value`
- `unit`

If your schema is different, update `backend/backend_config.json`.
