"""Verify reusable geocoding resources without making external requests."""

import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Event, Lock
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import astrology_engine


class LocationResourceTests(unittest.TestCase):
    def test_concurrent_lookups_reuse_one_serialized_in_memory_finder(self):
        initialized = []
        calls = []
        state_lock = Lock()
        state = {"active": 0, "max_active": 0}

        class LookupResource:
            def __init__(self, *, in_memory):
                initialized.append(in_memory)

            def timezone_at(self, *, lng, lat):
                with state_lock:
                    calls.append((lng, lat))
                    state["active"] += 1
                    state["max_active"] = max(state["max_active"], state["active"])
                # Yield execution to expose overlapping unsynchronized lookups.
                Event().wait(0.002)
                with state_lock:
                    state["active"] -= 1
                return "Etc/UTC"

        with patch.dict(sys.modules, {"timezonefinder": SimpleNamespace(TimezoneFinder=LookupResource)}):
            with patch.object(astrology_engine, "_timezone_finder", None):
                with ThreadPoolExecutor(max_workers=8) as pool:
                    results = list(pool.map(lambda value: astrology_engine._timezone_for_location(0.0, float(value)), range(12)))
        self.assertEqual(initialized, [True])
        self.assertEqual(results, ["Etc/UTC"] * 12)
        self.assertEqual(len(calls), 12)
        self.assertEqual(state["max_active"], 1)


if __name__ == "__main__":
    unittest.main()
