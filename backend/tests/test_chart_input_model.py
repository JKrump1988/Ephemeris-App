"""Chart input validation through the actual Pydantic API request model."""

import sys
import unittest
from datetime import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pydantic import ValidationError

from models import ChartCreate


def chart_payload(**changes):
    value = {
        "birth_date": "2024-02-12",
        "birth_time": "10:15:00",
        "birth_time_known": True,
        "location_name": "Synthetic test location",
        "latitude": 36.0,
        "longitude": -115.0,
        "timezone": "America/Los_Angeles",
    }
    value.update(changes)
    return value


class ChartInputModelTests(unittest.TestCase):
    def test_valid_input_preserves_seconds_and_microseconds(self):
        model = ChartCreate(**chart_payload(birth_time="10:15:27.123456"))
        self.assertEqual(model.birth_time, time(10, 15, 27, 123456))
        self.assertEqual(model.birth_time.isoformat(), "10:15:27.123456")

    def test_missing_time_is_rejected(self):
        payload = chart_payload()
        del payload["birth_time"]
        with self.assertRaisesRegex(ValidationError, "birth_time"):
            ChartCreate(**payload)

    def test_unknown_time_is_rejected(self):
        with self.assertRaisesRegex(ValidationError, "exact birth_time"):
            ChartCreate(**chart_payload(birth_time_known=False))

    def test_birth_time_known_does_not_coerce_boolean_like_values(self):
        for value in (1, 0, "true", "false", None):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                ChartCreate(**chart_payload(birth_time_known=value))

    def test_both_fold_offsets_are_accepted_and_preserved(self):
        for offset in ("-07:00", "-08:00"):
            with self.subTest(offset=offset):
                model = ChartCreate(**chart_payload(
                    birth_date="2024-11-03", birth_time="01:30", utc_offset=offset
                ))
                self.assertEqual(model.utc_offset, offset)

    def test_ambiguous_time_requires_an_explicit_offset(self):
        with self.assertRaisesRegex(ValidationError, "ambiguous"):
            ChartCreate(**chart_payload(birth_date="2024-11-03", birth_time="01:30"))

    def test_nonexistent_time_is_rejected(self):
        with self.assertRaisesRegex(ValidationError, "nonexistent"):
            ChartCreate(**chart_payload(birth_date="2024-03-10", birth_time="02:30"))

    def test_incorrect_offset_is_rejected(self):
        with self.assertRaisesRegex(ValidationError, "utc_offset.*does not match"):
            ChartCreate(**chart_payload(utc_offset="-07:00"))

    def test_nonfinite_coordinates_are_rejected(self):
        for field in ("latitude", "longitude"):
            for value in (float("nan"), float("inf"), float("-inf")):
                with self.subTest(field=field, value=value), self.assertRaises(ValidationError):
                    ChartCreate(**chart_payload(**{field: value}))

    def test_boolean_and_string_coordinates_are_rejected(self):
        for field in ("latitude", "longitude"):
            for value in (True, False, "36.0"):
                with self.subTest(field=field, value=value), self.assertRaises(ValidationError):
                    ChartCreate(**chart_payload(**{field: value}))

    def test_out_of_range_coordinates_are_rejected(self):
        for field, values in (("latitude", (-90.0001, 90.0001)), ("longitude", (-180.0001, 180.0001))):
            for value in values:
                with self.subTest(field=field, value=value), self.assertRaises(ValidationError):
                    ChartCreate(**chart_payload(**{field: value}))

    def test_valid_coordinate_bounds_are_accepted_for_later_house_validation(self):
        for latitude, longitude in ((-90, -180), (90, 180), (0, 0)):
            with self.subTest(latitude=latitude, longitude=longitude):
                model = ChartCreate(**chart_payload(latitude=latitude, longitude=longitude))
                self.assertEqual(model.latitude, latitude)
                self.assertEqual(model.longitude, longitude)

    def test_embedded_birth_time_offsets_are_rejected(self):
        for value in ("10:15:00Z", "10:15:00+00:00", "10:15:00-08:00"):
            with self.subTest(value=value), self.assertRaisesRegex(ValidationError, "birth_time"):
                ChartCreate(**chart_payload(birth_time=value))

    def test_excess_fractional_seconds_are_rejected_before_normalization(self):
        with self.assertRaisesRegex(ValidationError, "birth_time"):
            ChartCreate(**chart_payload(birth_time="10:15:27.1234567"))

    def test_invalid_timezone_is_rejected(self):
        for value in ("Invalid/Imaginary", "localtime", ""):
            with self.subTest(value=value), self.assertRaisesRegex(ValidationError, "timezone"):
                ChartCreate(**chart_payload(timezone=value))


if __name__ == "__main__":
    unittest.main()
