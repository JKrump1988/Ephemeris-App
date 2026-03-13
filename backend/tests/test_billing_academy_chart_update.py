"""Regression tests for billing tiers/checkout, academy catalog, and chart overwrite update flow."""

import os
import uuid
from pathlib import Path

import pytest
import requests


def _resolve_base_url() -> str | None:
    env_url = os.environ.get("REACT_APP_BACKEND_URL")
    if env_url:
        return env_url

    frontend_env = Path("/app/frontend/.env")
    if not frontend_env.exists():
        return None

    for line in frontend_env.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip()
    return None


BASE_URL = _resolve_base_url()


@pytest.fixture(scope="session")
def api_base_url():
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL is not configured")
    return BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def test_user(api_client, api_base_url):
    unique = uuid.uuid4().hex[:10]
    payload = {
        "name": f"TEST_Billing_{unique}",
        "email": f"test_billing_{unique}@example.com",
        "password": "TestPass123!",
    }

    response = api_client.post(f"{api_base_url}/api/auth/register", json=payload, timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == payload["email"]
    assert data["user"]["subscription_tier"] == "snapshot"
    return payload


@pytest.fixture(scope="session")
def authed_client(api_base_url, test_user):
    login = requests.post(
        f"{api_base_url}/api/auth/login",
        json={"email": test_user["email"], "password": test_user["password"]},
        timeout=30,
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    session = requests.Session()
    session.headers.update(
        {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }
    )
    return session


@pytest.fixture(scope="session")
def chart_seed_payload(authed_client, api_base_url):
    location_response = authed_client.get(
        f"{api_base_url}/api/locations/search", params={"q": "London"}, timeout=30
    )
    assert location_response.status_code == 200
    location = location_response.json()["results"][0]

    create_payload = {
        "birth_date": "1992-03-14",
        "birth_time": "07:20",
        "birth_time_known": True,
        "location_name": location["label"],
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "timezone": location["timezone"],
    }
    create_response = authed_client.post(f"{api_base_url}/api/chart", json=create_payload, timeout=60)
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["birth_date"] == create_payload["birth_date"]
    assert created["location_name"] == create_payload["location_name"]
    return {"location": location, "created": created}


def test_billing_tiers_returns_expected_structure(authed_client, api_base_url):
    response = authed_client.get(f"{api_base_url}/api/billing/tiers", timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert data["current_tier"] == "snapshot"
    assert [item["tier"] for item in data["tiers"]] == ["profile", "blueprint", "master"]
    assert all(item["accessible"] is False for item in data["tiers"])
    assert all(isinstance(item["amount"], (int, float)) and item["amount"] > 0 for item in data["tiers"])


def test_checkout_session_creation_for_locked_tier(authed_client, api_base_url):
    payload = {
        "tier": "profile",
        "origin_url": api_base_url,
    }
    response = authed_client.post(f"{api_base_url}/api/billing/checkout/session", json=payload, timeout=60)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["session_id"], str) and len(data["session_id"]) > 5
    assert isinstance(data["url"], str) and data["url"].startswith("http")


def test_checkout_status_sync_for_created_session(authed_client, api_base_url):
    create_response = authed_client.post(
        f"{api_base_url}/api/billing/checkout/session",
        json={"tier": "blueprint", "origin_url": api_base_url},
        timeout=60,
    )
    assert create_response.status_code == 200
    session_id = create_response.json()["session_id"]

    status_response = authed_client.get(
        f"{api_base_url}/api/billing/checkout/status/{session_id}",
        timeout=60,
    )
    assert status_response.status_code == 200
    data = status_response.json()
    assert data["session_id"] == session_id
    assert data["target_tier"] in {"profile", "blueprint", "master"}
    assert data["current_tier"] in {"snapshot", "profile", "blueprint", "master"}
    assert isinstance(data["message"], str) and len(data["message"]) > 5


def test_academy_catalog_loads_courses_modules_lessons(authed_client, api_base_url):
    response = authed_client.get(f"{api_base_url}/api/academy/catalog", timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["title"], str) and len(data["title"]) > 3
    assert isinstance(data["courses"], list) and len(data["courses"]) > 0

    first_course = data["courses"][0]
    assert isinstance(first_course["modules"], list) and len(first_course["modules"]) > 0
    first_module = first_course["modules"][0]
    assert isinstance(first_module["lessons"], list) and len(first_module["lessons"]) > 0


def test_put_chart_current_overwrites_existing_chart(authed_client, api_base_url, chart_seed_payload):
    original = chart_seed_payload["created"]

    update_payload = {
        "birth_date": "1990-10-01",
        "birth_time": None,
        "birth_time_known": False,
        "location_name": "Tokyo, Japan",
        "latitude": 35.6762,
        "longitude": 139.6503,
        "timezone": "Asia/Tokyo",
    }
    update_response = authed_client.put(f"{api_base_url}/api/chart/current", json=update_payload, timeout=60)
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["id"] == original["id"]
    assert updated["birth_date"] == "1990-10-01"
    assert updated["birth_time"] is None
    assert updated["location_name"] == "Tokyo, Japan"
    assert updated["approximate_time_used"] is True

    get_response = authed_client.get(f"{api_base_url}/api/chart/current", timeout=30)
    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched["id"] == original["id"]
    assert fetched["location_name"] == "Tokyo, Japan"
    assert fetched["birth_time"] is None


def test_existing_daily_and_snapshot_flows_still_work(authed_client, api_base_url):
    reading_response = authed_client.get(f"{api_base_url}/api/readings/snapshot", timeout=40)
    assert reading_response.status_code == 200
    reading = reading_response.json()
    assert reading["tier"] == "snapshot"
    assert reading["accessible"] is True
    assert isinstance(reading["sections"], list) and len(reading["sections"]) > 0

    daily_response = authed_client.get(f"{api_base_url}/api/daily", timeout=40)
    assert daily_response.status_code == 200
    daily = daily_response.json()
    assert isinstance(daily["highlights"], list) and len(daily["highlights"]) > 0
    assert isinstance(daily["cosmic_weather"], str) and len(daily["cosmic_weather"]) > 10
