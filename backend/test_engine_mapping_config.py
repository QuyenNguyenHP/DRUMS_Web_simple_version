import json
import unittest
from pathlib import Path
from xml.etree import ElementTree

from engine_mapping_config import get_engine_svg_mapping, resolve_vessel_mappings


class EngineMappingTests(unittest.TestCase):
    def test_engine_reference_inline_and_default_are_isolated(self):
        config = {
            "engine_svg_mappings": {"main": {"speed": ["M/E REVOLUTION"]}},
            "vessels": {"v": {
                "engine_svg_mapping": {"speed": ["ENGINE SPEED"]},
                "engines": [
                    {"key": "DG1"},
                    {"key": "PORT", "engine_svg_mapping": "main"},
                    {"key": "STBD", "engine_svg_mapping": {"speed": ["RPM"]}},
                    {"key": "empty", "engine_svg_mapping": {}},
                ],
            }},
        }
        vessel = resolve_vessel_mappings(config)["v"]
        mappings = [get_engine_svg_mapping(vessel, engine) for engine in vessel["engines"]]
        self.assertEqual(mappings, [{"speed": ["ENGINE SPEED"]}, {"speed": ["M/E REVOLUTION"]}, {"speed": ["RPM"]}, {}])
        mappings[1]["speed"].append("changed")
        self.assertEqual(config["engine_svg_mappings"]["main"]["speed"], ["M/E REVOLUTION"])

    def test_invalid_engine_mapping_is_rejected(self):
        for mapping in ["missing", None, [], {"speed": "RPM"}, {"speed": [123]}]:
            with self.subTest(mapping=mapping), self.assertRaises(ValueError):
                resolve_vessel_mappings({"vessels": {"v": {"engines": [{"key": "PORT", "engine_svg_mapping": mapping}]}}})

    def test_h429_uses_separate_valid_svg_bindings(self):
        root = Path(__file__).resolve().parent.parent
        config = json.loads((root / "backend/backend_config.json").read_text(encoding="utf-8"))
        vessel = resolve_vessel_mappings(config)["H429"]
        engines = {engine["key"]: engine for engine in vessel["engines"]}
        main = get_engine_svg_mapping(vessel, engines["PORT"])
        self.assertEqual(main, get_engine_svg_mapping(vessel, engines["STBD"]))
        self.assertEqual(main["engine_speed_rpm"], ["M/E REVOLUTION"])
        self.assertEqual(main["starting_air_mpa"], ["NO.2 START AIR PRESS"])
        self.assertEqual(main["ht_cw_outlet_c"], ["H.T. F.W. TEMP."])
        for engine_key in ["DG1", "DG2", "DG3"]:
            self.assertEqual(get_engine_svg_mapping(vessel, engines[engine_key]), vessel["engine_svg_mapping"])
        svg_ids = {element.get("id") for element in ElementTree.parse(root / "frontend/public/Engine_indicator.svg").iter()}
        self.assertTrue(set(main).issubset(svg_ids))
        self.assertEqual(main["lt_cw_inlet_mpa"], [])
        self.assertEqual(main["running_hour_h"], [])
        # Analog readings must not bind similarly named M/E alarm channels.
        self.assertEqual(main["no1_temp_c"], ["NO.1 CYL. EXH. GAS OUTLET TEMP."])


if __name__ == "__main__":
    unittest.main()
