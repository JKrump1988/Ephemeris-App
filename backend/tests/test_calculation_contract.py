"""Reference-executable agreement and calculation failure contracts.

The numerical expectations were produced by upstream swetest, not this app.
They check integration with the same astronomy library, not independent
astronomical accuracy. Actual chart coordinates always use real pyswisseph.
Mocks below exercise malformed upstream results and failure branches only.
"""

import json
import os
import sys
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import swisseph as swe

from astrology_engine import (
    calculate_houses,
    degree_in_sign,
    generate_natal_chart,
    planet_payload,
)
from birth_time import BirthTimeError
from ephemeris_runtime import (
    EphemerisSettings,
    EphemerisUnavailableError,
    calculate_body,
    calculation_metadata,
    load_settings,
)


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "swetest_moshier_2_10_03.json"
BACKEND_MASK = swe.FLG_JPLEPH | swe.FLG_SWIEPH | swe.FLG_MOSEPH
MOSHIER_FLAGS = swe.FLG_MOSEPH | swe.FLG_SPEED


@contextmanager
def configured_backend(backend=None, path=None):
    """Make each test independent of the developer's deployment settings."""
    with patch.dict(os.environ, {}, clear=False):
        for name in ("EPHEMERIS_BACKEND", "EPHEMERIS_PATH", "SE_EPHE_PATH"):
            os.environ.pop(name, None)
        if backend is not None:
            os.environ["EPHEMERIS_BACKEND"] = backend
        if path is not None:
            os.environ["EPHEMERIS_PATH"] = str(path)
        yield


def synthetic_input(**changes):
    value = {
        "birth_date": "2000-01-01",
        "birth_time": "12:00:00",
        "birth_time_known": True,
        "timezone": "UTC",
        "latitude": 51.4779,
        "longitude": 0.0,
        "location_name": "Synthetic test location",
    }
    value.update(changes)
    return value


def circular_difference(first, second):
    # Independent comparison helper, not the application's angle function.
    return abs((first - second + 180) % 360 - 180)


class SwetestReferenceAgreementTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads(FIXTURE_PATH.read_text())
        cls.cases = {case["id"]: case for case in cls.fixture["cases"]}
        cls.tolerances = cls.fixture["proposed_comparison_tolerances"]

    def assert_reference_case(self, case_id, input_override=None):
        case = self.cases[case_id]
        chart_input = dict(case["input"])
        chart_input.update(input_override or {})
        with configured_backend("moshier"):
            chart = generate_natal_chart(chart_input)
        calculated = {
            name: placement
            for name, placement in chart["placements"].items()
            if placement.get("source") == "calculated"
        }
        self.assertEqual(len(calculated), 11)
        self.assertEqual(set(calculated), set(case["placements"]))
        for name, expected in case["placements"].items():
            actual = calculated[name]
            with self.subTest(case=case_id, body=name):
                self.assertLessEqual(
                    circular_difference(actual["longitude"], expected["longitude"]),
                    self.tolerances["angles_deg"],
                )
                self.assertAlmostEqual(
                    actual["latitude"], expected["latitude"],
                    delta=self.tolerances["angles_deg"],
                )
                self.assertAlmostEqual(
                    actual["distance_au"], expected["distance_au"],
                    delta=self.tolerances["distance_au"],
                )
                self.assertAlmostEqual(
                    actual["longitude_speed_deg_per_day"],
                    expected["longitude_speed_deg_per_day"],
                    delta=self.tolerances["longitude_speed_deg_per_day"],
                )
                self.assertEqual(actual["retrograde"], expected["retrograde"])
                self.assertEqual(actual["calculation_flags"] & BACKEND_MASK, swe.FLG_MOSEPH)
                self.assertTrue(actual["calculation_flags"] & swe.FLG_SPEED)

        self.assertEqual(len(chart["houses"]["cusps"]), 12)
        for number, (actual, expected) in enumerate(
            zip(chart["houses"]["cusps"], case["cusps"]), start=1
        ):
            with self.subTest(case=case_id, cusp=number):
                self.assertLessEqual(
                    circular_difference(actual, expected),
                    self.tolerances["angles_deg"],
                )
        for name in ("ascendant", "midheaven"):
            with self.subTest(case=case_id, angle=name):
                self.assertLessEqual(
                    circular_difference(chart["houses"][name]["longitude"], case[name]),
                    self.tolerances["angles_deg"],
                )
        metadata = chart["meta"]["calculation_engine"]
        self.assertEqual(metadata["backend_requested"], "moshier")
        self.assertEqual(metadata["backend_effective"], "moshier")
        self.assertFalse(metadata["fallback_permitted"])
        self.assertEqual(metadata["data_files"], [])
        self.assertEqual(set(metadata["returned_flags"]), set(calculated))
        self.assertFalse(chart["meta"]["approximate_time_used"])
        self.assertGreater(chart["meta"]["julian_day_tt"], chart["meta"]["julian_day_ut1"])
        return chart

    def test_j2000_greenwich_matches_upstream_swetest(self):
        self.assert_reference_case("j2000_greenwich")

    def test_southern_latitude_matches_upstream_swetest(self):
        self.assert_reference_case("southern_latitude")

    def test_late_fold_utc_instant_matches_upstream_swetest(self):
        self.assert_reference_case("synthetic_fold_late_instant")

    def test_local_fold_offset_resolves_to_the_reference_instant(self):
        chart = self.assert_reference_case(
            "synthetic_fold_late_instant",
            {
                "birth_time": "01:30:00",
                "timezone": "America/Los_Angeles",
                "utc_offset": "-08:00",
            },
        )
        self.assertEqual(chart["meta"]["utc_datetime"], "2024-11-03T09:30:00+00:00")
        self.assertEqual(chart["meta"]["utc_offset_seconds"], -28800)


class BackendPolicyTests(unittest.TestCase):
    def test_default_swiss_backend_requires_a_data_directory(self):
        with configured_backend(), self.assertRaisesRegex(
            EphemerisUnavailableError, "File-backed Swiss Ephemeris requires"
        ):
            generate_natal_chart(synthetic_input())

    def test_unknown_backend_is_rejected(self):
        with configured_backend("unknown"), self.assertRaisesRegex(
            EphemerisUnavailableError, "EPHEMERIS_BACKEND"
        ):
            load_settings()

    def test_relative_data_directory_is_rejected(self):
        with configured_backend("swiss", "."), self.assertRaisesRegex(
            EphemerisUnavailableError, "absolute directory"
        ):
            load_settings()

    def test_conflicting_library_and_application_paths_are_rejected(self):
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            with configured_backend("swiss", first):
                os.environ["SE_EPHE_PATH"] = second
                with self.assertRaisesRegex(EphemerisUnavailableError, "same directory"):
                    load_settings()

    def test_empty_data_directory_cannot_silently_fall_back(self):
        # Uses the real binding in a clean session; no astronomy call is mocked.
        with tempfile.TemporaryDirectory() as directory:
            with configured_backend("swiss", directory), self.assertRaisesRegex(
                EphemerisUnavailableError, "fallback is not permitted"
            ):
                generate_natal_chart(synthetic_input())

    def test_zero_lunar_file_coverage_is_rejected(self):
        # A failed file open may leave a filename. This is a provenance-failure
        # test, not a fabricated successful chart or numerical reference.
        with tempfile.TemporaryDirectory() as directory:
            planetary_path = Path(directory) / "planetary-provenance-test.bin"
            planetary_path.write_bytes(b"test provenance payload")
            reported_files = [
                (str(planetary_path), 2000000.0, 3000000.0, 431),
                (str(Path(directory) / "missing-lunar.se1"), 0.0, 0.0, 0),
            ]
            with patch("ephemeris_runtime.swe.get_current_file_data", side_effect=reported_files):
                with self.assertRaisesRegex(EphemerisUnavailableError, "loaded lunar"):
                    calculation_metadata(EphemerisSettings("swiss", Path(directory)), {}, 2451545.0)

    def test_invalid_birth_inputs_fail_before_backend_initialization(self):
        changes = (
            {"birth_time": None},
            {"birth_time_known": False},
            {"timezone": "Invalid/Imaginary"},
            {"birth_date": "2024-03-10", "birth_time": "02:30", "timezone": "America/Los_Angeles"},
            {"birth_date": "2024-11-03", "birth_time": "01:30", "timezone": "America/Los_Angeles"},
            {"latitude": float("nan")},
            {"longitude": float("inf")},
            {"latitude": True},
            {"longitude": 181},
        )
        with configured_backend():
            for changed_fields in changes:
                with self.subTest(fields=changed_fields), patch(
                    "astrology_engine.ephemeris_session"
                ) as initialize:
                    with self.assertRaises(BirthTimeError):
                        generate_natal_chart(synthetic_input(**changed_fields))
                    initialize.assert_not_called()


class CalculationFailureTests(unittest.TestCase):
    def setUp(self):
        # Start with real Sun coordinates, then alter only the field needed to
        # exercise a failure response from the upstream binding.
        swe.close()
        self.values, self.flags = swe.calc_ut(2451545.0, swe.SUN, MOSHIER_FLAGS)

    def tearDown(self):
        swe.close()

    def test_returned_backend_must_match_for_each_requested_body(self):
        for body, name in ((swe.SUN, "Sun"), (swe.MOON, "Moon"), (swe.TRUE_NODE, "North Node")):
            with self.subTest(body=name), patch(
                "ephemeris_runtime.swe.calc_ut", return_value=(self.values, self.flags)
            ):
                with self.assertRaisesRegex(EphemerisUnavailableError, f"{name} requested swiss"):
                    calculate_body(2451545.0, body, name, swe.FLG_SWIEPH | swe.FLG_SPEED)

    def test_missing_longitude_speed_flag_is_rejected(self):
        with patch("ephemeris_runtime.swe.calc_ut", return_value=(self.values, swe.FLG_MOSEPH)):
            with self.assertRaisesRegex(EphemerisUnavailableError, "speed was not returned"):
                calculate_body(2451545.0, swe.SUN, "Sun", MOSHIER_FLAGS)

    def test_nonfinite_values_in_every_coordinate_field_are_rejected(self):
        for index in range(6):
            for invalid in (float("nan"), float("inf"), float("-inf")):
                values = list(self.values)
                values[index] = invalid
                with self.subTest(index=index, invalid=invalid), patch(
                    "ephemeris_runtime.swe.calc_ut", return_value=(values, self.flags)
                ):
                    with self.assertRaisesRegex(EphemerisUnavailableError, "invalid coordinates"):
                        calculate_body(2451545.0, swe.SUN, "Sun", MOSHIER_FLAGS)

    def test_incomplete_coordinate_vector_is_rejected(self):
        with patch("ephemeris_runtime.swe.calc_ut", return_value=(self.values[:5], self.flags)):
            with self.assertRaisesRegex(EphemerisUnavailableError, "invalid coordinates"):
                calculate_body(2451545.0, swe.SUN, "Sun", MOSHIER_FLAGS)

    def test_upstream_error_does_not_expose_a_server_path(self):
        with patch("ephemeris_runtime.swe.calc_ut", side_effect=swe.Error("/private/data/secret.se1")):
            with self.assertRaises(EphemerisUnavailableError) as raised:
                calculate_body(2451545.0, swe.SUN, "Sun", MOSHIER_FLAGS)
        self.assertNotIn("/private", str(raised.exception))
        self.assertIn("Sun", str(raised.exception))

    def test_polar_placidus_fails_without_substituting_another_system(self):
        with self.assertRaisesRegex(BirthTimeError, "Placidus.*no alternative"):
            calculate_houses(2451545.0, 89.0, 0.0)

    def test_missing_house_angle_vector_is_rejected_as_a_contract_error(self):
        # A malformed binding response must not escape as an IndexError.
        with patch("astrology_engine.swe.houses_ex", return_value=(tuple(range(12)), ())):
            with self.assertRaises(EphemerisUnavailableError):
                calculate_houses(2451545.0, 51.4779, 0.0)


class PlacementPrecisionTests(unittest.TestCase):
    def test_south_node_inherits_real_direct_and_retrograde_north_node_motion(self):
        for birth_date, expected_retrograde in (("2000-01-01", True), ("2024-04-01", False)):
            with self.subTest(date=birth_date), configured_backend("moshier"):
                chart = generate_natal_chart(synthetic_input(birth_date=birth_date))
            north = chart["placements"]["North Node"]
            south = chart["placements"]["South Node"]
            self.assertEqual(north["retrograde"], expected_retrograde)
            self.assertEqual(south["retrograde"], expected_retrograde)
            self.assertEqual(south["longitude_speed_deg_per_day"], north["longitude_speed_deg_per_day"])
            self.assertLess(circular_difference(south["longitude"], north["longitude"] + 180), 1e-12)
            self.assertEqual(south["source"], "derived")

    def test_degree_near_sign_boundary_is_not_rounded_up_to_thirty(self):
        # Synthetic scalar inputs test representation only, not astronomy.
        for longitude in (29.99999, 359.99999):
            with self.subTest(longitude=longitude):
                self.assertLess(degree_in_sign(longitude), 30)
                payload = planet_payload("representation-only", longitude, 0.0, None)
                self.assertEqual(payload["longitude"], longitude)
                self.assertLess(payload["degree"], 30)

    def test_repeated_natal_calculation_preserves_factual_results(self):
        with configured_backend("moshier"):
            first = generate_natal_chart(synthetic_input())
            second = generate_natal_chart(synthetic_input())
        # Legacy transit timestamps are dynamic, so the reproducibility gate is
        # explicitly the natal record, not the entire mixed response payload.
        for key in ("placements", "houses", "aspects", "meta"):
            self.assertEqual(first[key], second[key])


if __name__ == "__main__":
    unittest.main()
