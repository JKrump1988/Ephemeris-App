"""Core API regression tests for auth, chart onboarding, readings, daily, and platform overview."""

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
        "name": f"TEST_User_{unique}",
        "email": f"test_{unique}@example.com",
        "password": "TestPass123!",
    }

    response = api_client.post(f"{api_base_url}/api/auth/register", json=payload, timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == payload["email"]
    assert data["user"]["name"] == payload["name"]
    assert data["user"]["has_chart"] is False
    assert isinstance(data["access_token"], str) and len(data["access_token"]) > 10
    return payload


@pytest.fixture(scope="session")
def auth_token(api_client, api_base_url, test_user):
    login_payload = {"email": test_user["email"], "password": test_user["password"]}
    response = api_client.post(f"{api_base_url}/api/auth/login", json=login_payload, timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == test_user["email"]
    assert data["token_type"] == "bearer"
    return data["access_token"]


@pytest.fixture(scope="session")
def authed_client(api_client, auth_token):
    session = requests.Session()
    session.headers.update(
        {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}",
        }
    )
    return session


@pytest.fixture(scope="session")
def location_result(authed_client, api_base_url):
    response = authed_client.get(f"{api_base_url}/api/locations/search", params={"q": "New York"}, timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "New York"
    assert isinstance(data["results"], list)
    assert len(data["results"]) > 0
    first = data["results"][0]
    for key in ["label", "latitude", "longitude", "timezone", "id"]:
        assert key in first
    return first


def test_platform_overview_public(api_client, api_base_url):
    response = api_client.get(f"{api_base_url}/api/platform/overview", timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data.get("system_architecture"), list) and len(data["system_architecture"]) > 0
    assert isinstance(data.get("safety_framework"), list) and len(data["safety_framework"]) > 0


def test_register_duplicate_email_rejected(api_client, api_base_url, test_user):
    response = api_client.post(f"{api_base_url}/api/auth/register", json=test_user, timeout=30)
    assert response.status_code == 400
    assert "already exists" in response.json().get("detail", "").lower()


def test_me_returns_registered_user(authed_client, api_base_url, test_user):
    response = authed_client.get(f"{api_base_url}/api/auth/me", timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user["email"]
    assert data["name"] == test_user["name"]
    assert data["subscription_tier"] == "snapshot"


def test_chart_current_returns_404_before_creation(authed_client, api_base_url):
    response = authed_client.get(f"{api_base_url}/api/chart/current", timeout=30)
    assert response.status_code == 404
    assert "no saved chart" in response.json().get("detail", "").lower()


def test_create_chart_and_verify_persistence(authed_client, api_base_url, location_result):
    chart_payload = {
        "birth_date": "1994-11-23",
        "birth_time": "09:24",
        "birth_time_known": True,
        "location_name": location_result["label"],
        "latitude": location_result["latitude"],
        "longitude": location_result["longitude"],
        "timezone": location_result["timezone"],
    }
    create_response = authed_client.post(f"{api_base_url}/api/chart", json=chart_payload, timeout=60)
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["birth_date"] == chart_payload["birth_date"]
    assert created["birth_time"] == chart_payload["birth_time"]
    assert created["location_name"] == chart_payload["location_name"]
    assert created["timezone"] == chart_payload["timezone"]
    assert created["chart"]["placements"]["Sun"]["name"] == "Sun"
    assert created["chart"]["placements"]["Moon"]["name"] == "Moon"
    assert isinstance(created["tier_access"], list) and len(created["tier_access"]) == 4

    get_response = authed_client.get(f"{api_base_url}/api/chart/current", timeout=30)
    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched["id"] == created["id"]
    assert fetched["birth_date"] == chart_payload["birth_date"]
    assert fetched["location_name"] == chart_payload["location_name"]
    assert fetched["chart"]["placements"]["Ascendant"]["name"] == "Ascendant"


@pytest.mark.parametrize(
    "tier,expected_access,expected_preview",
    [
        ("snapshot", True, False),
        ("profile", False, True),
        ("blueprint", False, True),
        ("master", False, True),
    ],
)
def test_readings_tiers(authed_client, api_base_url, tier, expected_access, expected_preview):
    response = authed_client.get(f"{api_base_url}/api/readings/{tier}", timeout=40)
    assert response.status_code == 200
    data = response.json()
    assert data["tier"] == tier
    assert data["accessible"] is expected_access
    assert data["preview"] is expected_preview
    assert isinstance(data["sections"], list) and len(data["sections"]) > 0
    assert isinstance(data["summary"], str) and len(data["summary"]) > 20


def test_daily_insights_payload(authed_client, api_base_url):
    response = authed_client.get(f"{api_base_url}/api/daily", timeout=40)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["cosmic_weather"], str) and len(data["cosmic_weather"]) > 10
    assert isinstance(data["personal_transit_note"], str) and len(data["personal_transit_note"]) > 10
    assert isinstance(data["reflection_prompt"], str) and len(data["reflection_prompt"]) > 10
    assert isinstance(data["highlights"], list) and len(data["highlights"]) > 0


def test_me_reflects_has_chart_after_chart_creation(authed_client, api_base_url):
    response = authed_client.get(f"{api_base_url}/api/auth/me", timeout=30)
    assert response.status_code == 200
    assert response.json()["has_chart"] is True
