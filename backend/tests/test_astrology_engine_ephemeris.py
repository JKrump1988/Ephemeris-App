from astrology_engine import EPHEMERIS_FLAGS, ensure_swiss_ephemeris_ready, swe, swiss_ephemeris_contract


def test_ephemeris_flags_require_moshier_and_speed():
    assert EPHEMERIS_FLAGS & swe.FLG_MOSEPH
    assert EPHEMERIS_FLAGS & swe.FLG_SPEED


def test_swiss_ephemeris_contract_metadata():
    contract = swiss_ephemeris_contract()
    assert contract["engine"] == "Swiss Ephemeris (pyswisseph)"
    assert contract["mode"] == "Moshier"
    assert contract["flags"] == ["FLG_MOSEPH", "FLG_SPEED"]


def test_swiss_ephemeris_runtime_contract_is_available():
    ensure_swiss_ephemeris_ready()
