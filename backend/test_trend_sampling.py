"""SQL sampling regression tests; SQLite executes the window query offline.

MySQL formatting functions are adapted below. Live MySQL query plans/timings
must still be checked against deployment data and indexes.
"""
import ast
import sqlite3
import unittest
from pathlib import Path


def trend_sql(serials, channels):
    tree = ast.parse(Path(__file__).with_name('database_api_overview.py').read_text(encoding='utf-8'))
    function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'build_overview_trend_payload')
    query = next(n for n in ast.walk(function) if isinstance(n, ast.JoinedStr) and any(isinstance(v, ast.Constant) and 'WITH filtered_records' in str(v.value) for v in n.values))
    scope = {
        'quote_mysql_identifier': lambda s: f'`{s}`',
        'MYSQL_SERIAL_COLUMN': 'SerialNo', 'MYSQL_CHANNEL_COLUMN': 'ChannelDescription',
        'MYSQL_TIMESTAMP_COLUMN': 'TimeStamp', 'MYSQL_VALUE_COLUMN': 'Value',
        'quoted_data_table': '`data`',
        'serial_placeholders': ', '.join(['%s'] * len(serials)),
        'channel_placeholders': ', '.join(['%s'] * len(channels)),
    }
    sql = eval(compile(ast.Expression(query), '<trend query>', 'eval'), scope)
    return sql.replace('%s', '?').replace('SECOND,', "'SECOND',")


class TrendSamplingTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.create_function('TIMESTAMPDIFF', 3, lambda unit, start, end: end - start)
        self.db.create_function('UNIX_TIMESTAMP', 1, lambda value: value)
        self.db.create_function('DATE_FORMAT', 2, lambda value, fmt: str(value))
        self.db.create_function('FLOOR', 1, lambda value: int(value // 1))
        self.db.execute('CREATE TABLE data (SerialNo TEXT, ChannelDescription TEXT, TimeStamp INTEGER, Value TEXT)')
        self.rows = [(serial, channel, t, str(t + offset))
                     for serial in ['A', 'B']
                     for offset, channel in enumerate(['Load', 'Speed', 'Pressure'])
                     for t in [0, 1, 4, 9, 10, 13, 19, 20, 29, 30]]
        # Preserve distinct values at tied timestamps and nulls, deduplicate exact rows.
        self.rows += [('A', 'Load', 0, '99'), ('A', 'Load', 0, '99'), ('B', 'Pressure', 30, '')]
        self.db.executemany('INSERT INTO data VALUES (?, ?, ?, ?)', self.rows)

    def tearDown(self):
        self.db.close()

    def test_multi_channel_edges_match_reference(self):
        for channels in [['Load'], ['Load', 'Speed'], ['Load', 'Speed', 'Pressure']]:
            for serials in [['A'], ['A', 'B']]:
                with self.subTest(channels=channels, serials=serials):
                    result = self.db.execute(trend_sql(serials, channels), [0, 10, *serials, *channels, 0, 30]).fetchall()
                    groups = {}
                    for serial, channel, t, value in self.rows:
                        if serial in serials and channel in channels:
                            groups.setdefault((serial, channel, t // 10), []).append((t, value))
                    expected = set()
                    for (serial, channel, _), rows in groups.items():
                        edges = {min(t for t, v in rows), max(t for t, v in rows)}
                        expected.update((serial, channel, t * 1000, str(t), float(v) if v else None)
                                        for t, v in rows if t in edges)
                    self.assertEqual(set(result), expected)
                    self.assertEqual(len(result), len(expected))
                    self.assertEqual(result, sorted(result, key=lambda row: (row[2], row[0], row[1])))

    def test_empty_selection_result(self):
        self.assertEqual(self.db.execute(trend_sql(['A'], ['Missing']), [0, 10, 'A', 'Missing', 0, 30]).fetchall(), [])

    def test_range_boundaries(self):
        result = self.db.execute(trend_sql(['A'], ['Load']), [4, 10, 'A', 'Load', 4, 19]).fetchall()
        self.assertEqual([row[2] for row in result], [4000, 13000, 19000])


if __name__ == '__main__':
    unittest.main()
