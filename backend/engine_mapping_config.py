"""Resolve inline SVG mappings and shared fleet mapping references."""
from copy import deepcopy


def resolve_vessel_mappings(config):
    shared = config.get("engine_svg_mappings", {})
    if not isinstance(shared, dict):
        raise ValueError("engine_svg_mappings must be an object.")

    def validate_mapping(mapping):
        if not isinstance(mapping, dict) or any(
            not isinstance(aliases, list)
            or not all(isinstance(alias, str) for alias in aliases)
            for aliases in mapping.values()
        ):
            raise ValueError("Engine SVG mappings must contain arrays of strings.")

    for mapping in shared.values():
        validate_mapping(mapping)
    vessels = deepcopy(config.get("vessels", {}))
    for name, vessel in vessels.items():
        if not isinstance(vessel, dict):
            raise ValueError(f"vessels.{name} must be an object.")
        mapping = vessel.get("engine_svg_mapping", {})
        if isinstance(mapping, str):
            if mapping not in shared:
                raise ValueError(f"vessels.{name}: unknown engine SVG mapping reference.")
            mapping = shared[mapping]
        validate_mapping(mapping)
        vessel["engine_svg_mapping"] = deepcopy(mapping)
    return vessels
