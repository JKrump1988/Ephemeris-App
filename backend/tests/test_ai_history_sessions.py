"""Regression tests for AI astrologer saved session history and metadata persistence."""

import os
import uuid
from pathlib import Path

import pytest
import requests

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover
    MongoClient = None


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


def _resolve_backend_env_value(key: str) -> str | None:
    backend_env = Path("/app/backend/.env")
    if not backend_env.exists():
        return None
    for line in backend_env.read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip('"')
    return None


BASE_URL = _resolve_base_url()


@pytest.fixture(scope="session")
def api_base_url():
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL is not configured")
    return BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def db_client():
    if MongoClient is None:
        pytest.skip("pymongo unavailable for tier upgrade fixture")

    mongo_url = os.environ.get("MONGO_URL") or _resolve_backend_env_value("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or _resolve_backend_env_value("DB_NAME")
    if not mongo_url or not db_name:
        pytest.skip("Mongo environment not configured")

    client = MongoClient(mongo_url)
    db = client[db_name]
    try:
        yield db
    finally:
        client.close()


@pytest.fixture(scope="session")
def blueprint_client(api_base_url, db_client):
    unique = uuid.uuid4().hex[:10]
    creds = {
        "name": f"TEST_History_{unique}",
        "email": f"test_history_{unique}@example.com",
        "password": "TestPass123!",
    }

    register_response = requests.post(f"{api_base_url}/api/auth/register", json=creds, timeout=30)
    assert register_response.status_code == 200

    # Feature setup: promote user to blueprint for AI astrologer access.
    promoted = db_client.users.update_one(
        {"email": creds["email"]},
        {"$set": {"subscription_tier": "blueprint"}},
    )
    assert promoted.matched_count == 1

    login_response = requests.post(
        f"{api_base_url}/api/auth/login",
        json={"email": creds["email"], "password": creds["password"]},
        timeout=30,
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert login_data["user"]["subscription_tier"] == "blueprint"

    session = requests.Session()
    session.headers.update(
        {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {login_data['access_token']}",
        }
    )
    return session


@pytest.fixture(scope="session")
def charted_blueprint_client(blueprint_client, api_base_url):
    location_response = blueprint_client.get(
        f"{api_base_url}/api/locations/search",
        params={"q": "San Francisco"},
        timeout=30,
    )
    assert location_response.status_code == 200
    location = location_response.json()["results"][0]

    chart_payload = {
        "birth_date": "1993-04-12",
        "birth_time": "08:10",
        "birth_time_known": True,
        "location_name": location["label"],
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "timezone": location["timezone"],
    }
    chart_response = blueprint_client.post(f"{api_base_url}/api/chart", json=chart_payload, timeout=60)
    assert chart_response.status_code == 200
    assert chart_response.json()["chart"]["placements"]["Sun"]["name"] == "Sun"
    return blueprint_client


def test_saved_sessions_empty_before_first_message(charted_blueprint_client, api_base_url):
    # Session-list feature: new user should have no persisted conversation entries yet.
    list_response = charted_blueprint_client.get(f"{api_base_url}/api/ai-astrologer/sessions", timeout=30)
    assert list_response.status_code == 200
    data = list_response.json()
    assert "sessions" in data
    assert data["sessions"] == []


def test_message_creates_session_metadata_and_history_list_item(charted_blueprint_client, api_base_url):
    # Message persistence feature: title/preview/message_count should save after message send.
    session_id = f"ai-history-{uuid.uuid4().hex[:8]}"
    prompt = "Tell me what my Venus placement says about intimacy and values."
    message_response = charted_blueprint_client.post(
        f"{api_base_url}/api/ai-astrologer/message",
        json={"session_id": session_id, "message": prompt},
        timeout=120,
    )
    assert message_response.status_code == 200
    payload = message_response.json()
    assert payload["session_id"] == session_id
    assert payload["title"] == prompt
    assert isinstance(payload["reply"], str) and len(payload["reply"]) > 40
    assert len(payload["messages"]) == 2

    list_response = charted_blueprint_client.get(f"{api_base_url}/api/ai-astrologer/sessions", timeout=30)
    assert list_response.status_code == 200
    sessions = list_response.json()["sessions"]
    found = next((item for item in sessions if item["session_id"] == session_id), None)
    assert found is not None
    assert found["title"] == prompt
    assert found["message_count"] == 2
    assert isinstance(found["preview"], str) and len(found["preview"]) > 10
    assert isinstance(found["updated_at"], str) and len(found["updated_at"]) > 10


def test_loading_prior_session_returns_persisted_messages_and_session_title(charted_blueprint_client, api_base_url):
    # Session reload feature: prior session should load exact persisted messages for astrologer page history.
    session_id = f"ai-history-load-{uuid.uuid4().hex[:8]}"
    prompt = "How does my Saturn aspect shape discipline patterns?"
    send_response = charted_blueprint_client.post(
        f"{api_base_url}/api/ai-astrologer/message",
        json={"session_id": session_id, "message": prompt},
        timeout=120,
    )
    assert send_response.status_code == 200

    load_response = charted_blueprint_client.get(
        f"{api_base_url}/api/ai-astrologer/session/{session_id}",
        timeout=30,
    )
    assert load_response.status_code == 200
    loaded = load_response.json()
    assert loaded["session_id"] == session_id
    assert loaded["title"] == prompt
    assert loaded["eligible"] is True
    assert loaded["current_tier"] == "blueprint"
    assert isinstance(loaded["suggested_prompts"], list) and len(loaded["suggested_prompts"]) > 0
    assert len(loaded["messages"]) == 2
    assert loaded["messages"][0]["role"] == "user"
    assert loaded["messages"][0]["content"] == prompt
    assert loaded["messages"][1]["role"] == "assistant"
