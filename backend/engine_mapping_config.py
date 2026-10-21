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

    def resolve_mapping(mapping, path):
        if isinstance(mapping, str):
            if mapping not in shared:
                raise ValueError(f"{path}: unknown engine SVG mapping reference.")
            mapping = shared[mapping]
        validate_mapping(mapping)
        return deepcopy(mapping)

    vessels = deepcopy(config.get("vessels", {}))
    for name, vessel in vessels.items():
        if not isinstance(vessel, dict):
            raise ValueError(f"vessels.{name} must be an object.")
        vessel["engine_svg_mapping"] = resolve_mapping(
            vessel.get("engine_svg_mapping", {}), f"vessels.{name}"
        )
        for engine in vessel.get("engines", []):
            if "engine_svg_mapping" in engine:
                engine["engine_svg_mapping"] = resolve_mapping(
                    engine["engine_svg_mapping"],
                    f"vessels.{name}.engines.{engine.get('key', '')}",
                )
    return vessels


def get_engine_svg_mapping(vessel, engine):
    """An explicit engine mapping replaces the vessel default, including {}."""
    return engine.get("engine_svg_mapping", vessel.get("engine_svg_mapping", {}))
