"""Exercise real chart HTTP routes and models without external services.

Run with the project's FastAPI, httpx, Pydantic, and email-validator dependencies:
    python -m unittest discover -s backend/tests -p 'test_chart_time_roundtrip.py' -v

The production server module is loaded intact. Only database, authentication,
calculation, and unrelated integrations are substituted at their boundaries.
HTTP requests use an in-process ASGI transport; socket connections are forbidden.
"""

import importlib.util
import os
import sys
import unittest
from copy import deepcopy
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock, patch

import httpx
from fastapi import FastAPI


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from models import ChartCreate


# Expected HTTP representations are fixtures, not a copy of the route serializer.
TIME_CASES = (
    ("07:20", "07:20"),
    ("07:20:00", "07:20"),
    ("07:20:27", "07:20:27"),
    ("07:20:27.1", "07:20:27.100000"),
    ("07:20:27.12", "07:20:27.120000"),
    ("07:20:27.123", "07:20:27.123000"),
    ("07:20:27.1234", "07:20:27.123400"),
    ("07:20:27.12345", "07:20:27.123450"),
    ("07:20:27.123456", "07:20:27.123456"),
    ("07:20:00.000001", "07:20:00.000001"),
    ("00:00", "00:00"),
    ("23:59:59.999999", "23:59:59.999999"),
)


def chart_payload(birth_time="07:20", **changes):
    payload = {
        "birth_date": "1992-03-14",
        "birth_time": birth_time,
        "birth_time_known": True,
        "location_name": "Synthetic UTC location",
        "latitude": 51.48,
        "longitude": 0.0,
        "timezone": "Etc/UTC",
    }
    payload.update(changes)
    return payload


def rejected_payloads():
    for value in (
        "07:20:27:00",
        "07:20:27.123456:00",
        "07:20:27.1234567",
        "24:00",
        "07:20Z",
        "",
        None,
    ):
        yield f"birth_time={value!r}", chart_payload(value)
    missing = chart_payload()
    del missing["birth_time"]
    yield "missing birth_time", missing
    yield "unknown without time", chart_payload(None, birth_time_known=False)
    yield "unknown with a supplied time", chart_payload(birth_time_known=False)


class MemoryCollection:
    """The small MongoDB boundary used by the chart routes, with write recording."""

    def __init__(self, documents=()):
        self.documents = deepcopy(list(documents))
        self.updates = []

    async def find_one(self, query, projection=None):
        document = next(
            (item for item in self.documents if all(item.get(k) == v for k, v in query.items())),
            None,
        )
        if document is None:
            return None
        result = deepcopy(document)
        if projection:
            included = [key for key, enabled in projection.items() if enabled]
            if included:
                result = {key: result[key] for key in included if key in result}
            else:
                for key, enabled in projection.items():
                    if not enabled:
                        result.pop(key, None)
        return result

    async def update_one(self, query, update, upsert=False):
        if set(update) != {"$set"}:
            raise AssertionError(f"Unexpected database operation: {update!r}")
        self.updates.append(deepcopy((query, update, upsert)))
        document = next(
            (item for item in self.documents if all(item.get(k) == v for k, v in query.items())),
            None,
        )
        if document is None:
            if not upsert:
                raise AssertionError("Unexpected update of a missing document")
            document = deepcopy(query)
            self.documents.append(document)
        document.update(deepcopy(update["$set"]))
        return SimpleNamespace(acknowledged=True)


def unexpected_integration(*args, **kwargs):
    raise AssertionError("An unrelated external integration was called")


def stub_module(name, **attributes):
    module = ModuleType(name)
    module.__dict__.update(attributes)
    return module


def load_isolated_server(database):
    """Import server.py itself while preventing import-time service setup."""

    class MemoryMotorClient:
        def __init__(self, url):
            if url != "mongodb://isolated-test.invalid":
                raise AssertionError("Unexpected database configuration")

        def __getitem__(self, name):
            if name != "chart_time_test":
                raise AssertionError("Unexpected database name")
            return database

        def close(self):
            pass

    class UnavailableCalculation(RuntimeError):
        pass

    async def authentication_boundary():
        raise AssertionError("The test must override authentication")

    integration_attributes = {
        "ai_astrologer": (
            "build_session_preview", "build_session_title", "can_access_ai",
            "create_session_document", "generate_astrologer_reply", "serialise_session",
            "serialise_session_list_item",
        ),
        "payments": (
            "build_billing_catalog", "create_checkout_session_for_tier", "get_checkout_client",
            "process_webhook_event", "sync_checkout_status",
        ),
        "interpretation_engine": ("build_daily_insight", "build_reading"),
    }
    modules = {
        name: stub_module(name, **{attribute: unexpected_integration for attribute in attributes})
        for name, attributes in integration_attributes.items()
    }
    motor_asyncio = stub_module("motor.motor_asyncio", AsyncIOMotorClient=MemoryMotorClient)
    modules.update({
        "motor": stub_module("motor", motor_asyncio=motor_asyncio),
        "motor.motor_asyncio": motor_asyncio,
        "dotenv": stub_module("dotenv", load_dotenv=lambda *args, **kwargs: False),
        "academy_content": stub_module("academy_content", ACADEMY_CATALOG={}),
        "auth_utils": stub_module(
            "auth_utils",
            authenticate_user=unexpected_integration,
            create_access_token=unexpected_integration,
            get_current_user=authentication_boundary,
            get_password_hash=unexpected_integration,
            set_database=lambda value: None,
        ),
        "astrology_engine": stub_module(
            "astrology_engine",
            generate_natal_chart=unexpected_integration,
            search_locations=unexpected_integration,
        ),
        "ephemeris_runtime": stub_module(
            "ephemeris_runtime", EphemerisUnavailableError=UnavailableCalculation,
        ),
        "platform_content": stub_module(
            "platform_content", PLATFORM_OVERVIEW={}, build_tier_access=lambda tier: [],
        ),
    })
    spec = importlib.util.spec_from_file_location("_chart_time_test_server", BACKEND_DIR / "server.py")
    server = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, modules), patch.dict(
        os.environ, {"MONGO_URL": "mongodb://isolated-test.invalid", "DB_NAME": "chart_time_test"},
    ), patch("logging.basicConfig"):
        spec.loader.exec_module(server)
    return server


class ChartTimeHttpTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        for target in ("socket.create_connection", "socket.socket.connect"):
            blocker = patch(target, side_effect=AssertionError("Network access is forbidden in this suite"))
            blocker.start()
            self.addCleanup(blocker.stop)
        self.user = {"id": "chart-time-test-user", "subscription_tier": "snapshot", "has_chart": False}
        self.database = SimpleNamespace(
            charts=MemoryCollection(), users=MemoryCollection([self.user]),
        )
        self.server = load_isolated_server(self.database)
        self.assertIsInstance(self.server.app, FastAPI)
        self.assertIs(self.server.ChartCreate, ChartCreate)
        self.calculate = Mock(return_value={
            "meta": {"approximate_time_used": False, "note": "Isolated route test calculation"},
        })
        self.server.generate_natal_chart = self.calculate

        async def current_user():
            return deepcopy(self.user)

        self.server.app.dependency_overrides[self.server.get_current_user] = current_user
        self.addCleanup(self.server.app.dependency_overrides.clear)
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=self.server.app), base_url="http://isolated-test",
        )
        self.addAsyncCleanup(self.client.aclose)

    def assert_calculation_input(self, payload, expected_time):
        expected = {**payload, "birth_time": expected_time, "utc_offset": None}
        self.calculate.assert_called_with(expected)

    async def test_supported_times_survive_post_get_put_get(self):
        from datetime import time

        for supplied, canonical in TIME_CASES:
            with self.subTest(birth_time=supplied):
                self.database.charts.documents.clear()
                self.database.charts.updates.clear()
                self.database.users.updates.clear()
                self.calculate.reset_mock()
                payload = chart_payload(supplied)
                created_response = await self.client.post("/api/chart", json=payload)
                self.assertEqual(created_response.status_code, 200, created_response.text)
                created = created_response.json()
                self.assertTrue(created["id"])
                self.assertTrue(created["created_at"])
                self.assertEqual(created["birth_time"], canonical)
                self.assertEqual(time.fromisoformat(created["birth_time"]), time.fromisoformat(supplied))
                self.assertEqual(self.calculate.call_count, 1)
                self.assert_calculation_input(payload, canonical)

                fetched_response = await self.client.get("/api/chart/current")
                self.assertEqual(fetched_response.status_code, 200, fetched_response.text)
                self.assertEqual(fetched_response.json(), created)

                # Re-submit the saved server value while changing only date, then only location.
                updated_payload = {**payload, "birth_time": fetched_response.json()["birth_time"]}
                for change in (
                    {"birth_date": "1993-03-14"},
                    {"location_name": "Another synthetic UTC location", "latitude": 35.0, "longitude": 10.0},
                ):
                    with self.subTest(change=change):
                        updated_payload.update(change)
                        before_calls = self.calculate.call_count
                        updated_response = await self.client.put("/api/chart/current", json=updated_payload)
                        self.assertEqual(updated_response.status_code, 200, updated_response.text)
                        updated = updated_response.json()
                        self.assertEqual(updated["id"], created["id"])
                        self.assertEqual(updated["created_at"], created["created_at"])
                        self.assertEqual(updated["birth_time"], canonical)
                        self.assertFalse(updated["approximate_time_used"])
                        for field, value in change.items():
                            self.assertEqual(updated[field], value)
                        self.assertEqual(self.calculate.call_count, before_calls + 1)
                        self.assert_calculation_input(updated_payload, canonical)
                        fetched_response = await self.client.get("/api/chart/current")
                        self.assertEqual(fetched_response.status_code, 200, fetched_response.text)
                        self.assertEqual(fetched_response.json(), updated)

                self.assertEqual(len(self.database.charts.documents), 1)
                self.assertEqual(len(self.database.charts.updates), 3)
                self.assertEqual(len(self.database.users.updates), 3)
                self.assertEqual(self.database.charts.documents[0]["birth_time"], canonical)

    async def test_invalid_creation_returns_422_without_calculation_or_writes(self):
        original_user = deepcopy(self.database.users.documents)
        for label, payload in rejected_payloads():
            with self.subTest(case=label):
                response = await self.client.post("/api/chart", json=payload)
                self.assertEqual(response.status_code, 422, response.text)
                self.assert_validation_detail(response)
                self.calculate.assert_not_called()
                self.assertEqual(self.database.charts.documents, [])
                self.assertEqual(self.database.charts.updates, [])
                self.assertEqual(self.database.users.updates, [])
                self.assertEqual(self.database.users.documents, original_user)

    async def test_invalid_post_and_put_do_not_overwrite_saved_chart(self):
        created_response = await self.client.post("/api/chart", json=chart_payload("07:20:27.123456"))
        self.assertEqual(created_response.status_code, 200, created_response.text)
        created = created_response.json()
        chart_documents = deepcopy(self.database.charts.documents)
        user_documents = deepcopy(self.database.users.documents)
        for method, route in (("POST", "/api/chart"), ("PUT", "/api/chart/current")):
            for label, payload in rejected_payloads():
                with self.subTest(method=method, case=label):
                    response = await self.client.request(method, route, json=payload)
                    self.assertEqual(response.status_code, 422, response.text)
                    self.assert_validation_detail(response)
                    self.assertEqual(self.calculate.call_count, 1)
                    self.assertEqual(len(self.database.charts.updates), 1)
                    self.assertEqual(len(self.database.users.updates), 1)
                    self.assertEqual(self.database.charts.documents, chart_documents)
                    self.assertEqual(self.database.users.documents, user_documents)
                    fetched = await self.client.get("/api/chart/current")
                    self.assertEqual(fetched.status_code, 200, fetched.text)
                    self.assertEqual(fetched.json(), created)

    def assert_validation_detail(self, response):
        detail = response.json()["detail"]
        self.assertIsInstance(detail, list)
        self.assertTrue(detail)
        self.assertTrue(all(isinstance(item["msg"], str) and item["msg"] for item in detail))


if __name__ == "__main__":
    unittest.main()
