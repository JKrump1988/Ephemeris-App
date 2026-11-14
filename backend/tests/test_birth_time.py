"""Civil-time contract tests; no astronomy or third-party packages required."""

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from birth_time import BirthTimeError, resolve_birth_time


class ResolveBirthTimeTests(unittest.TestCase):
    def resolve(self, birth_date="2024-02-12", birth_time="10:15", **kwargs):
        settings = {"birth_time_known": True, "timezone_name": "America/Los_Angeles"}
        settings.update(kwargs)
        return resolve_birth_time(birth_date, birth_time, **settings)

    def test_ordinary_local_time_resolves_to_aware_utc(self):
        result = self.resolve()
        self.assertEqual(result, datetime(2024, 2, 12, 18, 15, tzinfo=timezone.utc))
        self.assertIs(result.tzinfo, timezone.utc)

    def test_spring_gap_is_rejected_even_with_an_offset(self):
        for offset in (None, "-08:00", "-07:00"):
            with self.subTest(offset=offset), self.assertRaisesRegex(BirthTimeError, "nonexistent"):
                self.resolve("2024-03-10", "02:30", utc_offset=offset)

    def test_autumn_fold_requires_disambiguation(self):
        with self.assertRaisesRegex(BirthTimeError, "ambiguous.*utc_offset") as error:
            self.resolve("2024-11-03", "01:30")
        self.assertIn("-07:00", str(error.exception))
        self.assertIn("-08:00", str(error.exception))

    def test_each_autumn_fold_resolves_to_its_own_utc_instant(self):
        early = self.resolve("2024-11-03", "01:30", utc_offset="-07:00")
        late = self.resolve("2024-11-03", "01:30", utc_offset="-08:00")
        self.assertEqual(early, datetime(2024, 11, 3, 8, 30, tzinfo=timezone.utc))
        self.assertEqual(late, datetime(2024, 11, 3, 9, 30, tzinfo=timezone.utc))
        self.assertEqual((late - early).total_seconds(), 3600)

    def test_wrong_offset_is_rejected_for_ambiguous_time(self):
        with self.assertRaisesRegex(BirthTimeError, "utc_offset.*does not match"):
            self.resolve("2024-11-03", "01:30", utc_offset="-06:00")

    def test_wrong_offset_is_rejected_for_unambiguous_time(self):
        with self.assertRaisesRegex(BirthTimeError, "utc_offset.*does not match"):
            self.resolve(utc_offset="-07:00")

    def test_matching_offset_is_accepted_for_unambiguous_time(self):
        self.assertEqual(self.resolve(utc_offset="-08:00"), self.resolve())

    def test_leap_day_is_validated(self):
        self.assertEqual(
            self.resolve("2024-02-29", "23:45", timezone_name="UTC"),
            datetime(2024, 2, 29, 23, 45, tzinfo=timezone.utc),
        )
        with self.assertRaisesRegex(BirthTimeError, "birth_date"):
            self.resolve("2023-02-29")

    def test_non_hour_timezone_offset_is_resolved(self):
        self.assertEqual(
            self.resolve("2024-02-12", "10:15", timezone_name="Asia/Kathmandu", utc_offset="+05:45"),
            datetime(2024, 2, 12, 4, 30, tzinfo=timezone.utc),
        )

    def test_date_rollover_is_preserved(self):
        self.assertEqual(
            self.resolve("2024-01-01", "00:15", timezone_name="Asia/Tokyo"),
            datetime(2023, 12, 31, 15, 15, tzinfo=timezone.utc),
        )

    def test_seconds_and_fractional_seconds_are_preserved(self):
        self.assertEqual(
            self.resolve("2024-02-12", "10:15:27.123456", timezone_name="UTC"),
            datetime(2024, 2, 12, 10, 15, 27, 123456, tzinfo=timezone.utc),
        )
        self.assertEqual(self.resolve(birth_time="10:15:27").second, 27)

    def test_excess_fractional_precision_is_rejected_not_truncated(self):
        with self.assertRaisesRegex(BirthTimeError, "birth_time"):
            self.resolve(birth_time="10:15:27.1234567")

    def test_missing_or_unknown_birth_time_never_substitutes_noon(self):
        for value in (None, ""):
            with self.subTest(value=value), self.assertRaisesRegex(BirthTimeError, "birth_time"):
                self.resolve(birth_time=value)
        with self.assertRaisesRegex(BirthTimeError, "exact birth_time"):
            self.resolve(birth_time_known=False)

    def test_birth_time_known_must_be_a_boolean(self):
        for value in (0, 1, "true", "false", None):
            with self.subTest(value=value), self.assertRaisesRegex(BirthTimeError, "birth_time_known"):
                self.resolve(birth_time_known=value)

    def test_timezone_must_be_explicit_and_known(self):
        for value in (None, "", "Invalid/Imaginary", "/etc/localtime", "../UTC", "localtime", "posixrules", "posix/UTC", "right/UTC"):
            with self.subTest(value=value), self.assertRaisesRegex(BirthTimeError, "timezone"):
                self.resolve(timezone_name=value)

    def test_date_requires_exact_calendar_format(self):
        for value in ("20240212", "2024-W07-1", "2024-2-12", "2024-02-30", None, 20240212):
            with self.subTest(value=value), self.assertRaisesRegex(BirthTimeError, "birth_date"):
                self.resolve(birth_date=value)

    def test_time_must_be_local_civil_time_without_embedded_offset(self):
        for value in ("10:15Z", "10:15+01:00", "10:15:00-08:00", "10:15:00Z"):
            with self.subTest(value=value), self.assertRaisesRegex(BirthTimeError, "birth_time"):
                self.resolve(birth_time=value)

    def test_invalid_time_formats_and_values_are_rejected(self):
        for value in ("1015", "10", "1:15", "24:00", "12:60", "12:00:60", "10:15.5", "10:15:00 ", 1015):
            with self.subTest(value=value), self.assertRaisesRegex(BirthTimeError, "birth_time"):
                self.resolve(birth_time=value)

    def test_invalid_offset_formats_and_values_are_rejected(self):
        for value in ("Z", "-0800", "-8:00", "+24:00", "+01:60", "+01:00:60", "", 0):
            with self.subTest(value=value), self.assertRaisesRegex(BirthTimeError, "utc_offset"):
                self.resolve(utc_offset=value)

    def test_historical_second_offset_can_be_supplied(self):
        self.assertEqual(
            self.resolve("1900-01-01", "12:00", timezone_name="Europe/Paris", utc_offset="+00:09:21"),
            datetime(1900, 1, 1, 11, 50, 39, tzinfo=timezone.utc),
        )

    def test_non_hour_dst_transition_is_validated(self):
        with self.assertRaisesRegex(BirthTimeError, "ambiguous"):
            self.resolve("2024-04-07", "01:45", timezone_name="Australia/Lord_Howe")
        first = self.resolve("2024-04-07", "01:45", timezone_name="Australia/Lord_Howe", utc_offset="+11:00")
        second = self.resolve("2024-04-07", "01:45", timezone_name="Australia/Lord_Howe", utc_offset="+10:30")
        self.assertEqual((second - first).total_seconds(), 1800)
        with self.assertRaisesRegex(BirthTimeError, "nonexistent"):
            self.resolve("2024-10-06", "02:15", timezone_name="Australia/Lord_Howe")

    def test_utc_conversion_overflow_has_a_field_specific_error(self):
        with self.assertRaisesRegex(BirthTimeError, "birth_date.*range"):
            self.resolve("0001-01-01", "00:00", timezone_name="Etc/GMT-1")


if __name__ == "__main__":
    unittest.main()
