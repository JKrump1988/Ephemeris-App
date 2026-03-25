"""Regression tests for AI Astrologer session/message endpoints, access gating, and chart-aware responses."""

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
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def snapshot_user(api_client, api_base_url):
    unique = uuid.uuid4().hex[:10]
    payload = {
        "name": f"TEST_AI_{unique}",
        "email": f"test_ai_{unique}@example.com",
        "password": "TestPass123!",
    }
    response = api_client.post(f"{api_base_url}/api/auth/register", json=payload, timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["subscription_tier"] == "snapshot"
    return payload


@pytest.fixture(scope="session")
def authed_client_snapshot(api_base_url, snapshot_user):
    login_response = requests.post(
        f"{api_base_url}/api/auth/login",
        json={"email": snapshot_user["email"], "password": snapshot_user["password"]},
        timeout=30,
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    session = requests.Session()
    session.headers.update(
        {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }
    )
    return session


@pytest.fixture(scope="session")
def charted_snapshot_user(authed_client_snapshot, api_base_url):
    location_response = authed_client_snapshot.get(
        f"{api_base_url}/api/locations/search", params={"q": "Los Angeles"}, timeout=30
    )
    assert location_response.status_code == 200
    location = location_response.json()["results"][0]

    chart_payload = {
        "birth_date": "1995-08-17",
        "birth_time": "06:45",
        "birth_time_known": True,
        "location_name": location["label"],
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "timezone": location["timezone"],
    }
    create_response = authed_client_snapshot.post(f"{api_base_url}/api/chart", json=chart_payload, timeout=60)
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["chart"]["placements"]["Sun"]["name"] == "Sun"
    return {"location": location, "chart": created}


@pytest.fixture(scope="session")
def db_client():
    if MongoClient is None:
        pytest.skip("pymongo unavailable; cannot seed blueprint tier for allow-list verification")

    mongo_url = os.environ.get("MONGO_URL") or _resolve_backend_env_value("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or _resolve_backend_env_value("DB_NAME")
    if not mongo_url or not db_name:
        pytest.skip("Mongo environment not configured for local seed setup")

    client = MongoClient(mongo_url)
    db = client[db_name]
    try:
        yield db
    finally:
        client.close()


@pytest.fixture(scope="session")
def promoted_blueprint_client(api_base_url, snapshot_user, db_client):
    update_result = db_client.users.update_one(
        {"email": snapshot_user["email"]},
        {"$set": {"subscription_tier": "blueprint"}},
    )
    assert update_result.matched_count == 1

    login_response = requests.post(
        f"{api_base_url}/api/auth/login",
        json={"email": snapshot_user["email"], "password": snapshot_user["password"]},
        timeout=30,
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["subscription_tier"] == "blueprint"

    token = login_response.json()["access_token"]
    session = requests.Session()
    session.headers.update(
        {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }
    )
    return session


def test_ai_session_is_blocked_for_snapshot_user(
    authed_client_snapshot, api_base_url, charted_snapshot_user
):
    _ = charted_snapshot_user
    session_id = f"ai-test-snapshot-{uuid.uuid4().hex[:8]}"
    response = authed_client_snapshot.get(f"{api_base_url}/api/ai-astrologer/session/{session_id}", timeout=30)
    assert response.status_code == 403
    assert "blueprint and master" in response.json().get("detail", "").lower()


def test_ai_message_blocked_for_snapshot_tier(authed_client_snapshot, api_base_url):
    payload = {
        "session_id": f"ai-test-denied-{uuid.uuid4().hex[:8]}",
        "message": "What does my Saturn placement mean for discipline?",
    }
    response = authed_client_snapshot.post(f"{api_base_url}/api/ai-astrologer/message", json=payload, timeout=40)
    assert response.status_code == 403
    assert "blueprint and master" in response.json().get("detail", "").lower()


def test_ai_message_allowed_for_blueprint_and_returns_chart_aware_reply(
    promoted_blueprint_client, api_base_url, charted_snapshot_user
):
    _ = charted_snapshot_user
    session_id = f"ai-test-allowed-{uuid.uuid4().hex[:8]}"

    session_response = promoted_blueprint_client.get(
        f"{api_base_url}/api/ai-astrologer/session/{session_id}", timeout=30
    )
    assert session_response.status_code == 200
    assert session_response.json()["eligible"] is True

    message_payload = {
        "session_id": session_id,
        "message": "Explain one major aspect in my chart and how it shapes my emotional patterns.",
    }
    response = promoted_blueprint_client.post(
        f"{api_base_url}/api/ai-astrologer/message", json=message_payload, timeout=90
    )
    assert response.status_code == 200

    data = response.json()
    assert data["session_id"] == session_id
    assert data["current_tier"] == "blueprint"
    assert isinstance(data["reply"], str) and len(data["reply"]) > 40
    assert isinstance(data["messages"], list) and len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][1]["role"] == "assistant"

    reply_lower = data["reply"].lower()
    assert any(keyword in reply_lower for keyword in ["sun", "moon", "house", "aspect", "transit", "saturn", "venus"])


def test_ai_session_returns_persisted_messages_for_same_session(promoted_blueprint_client, api_base_url):
    session_id = f"ai-test-memory-{uuid.uuid4().hex[:8]}"

    init_response = promoted_blueprint_client.get(
        f"{api_base_url}/api/ai-astrologer/session/{session_id}", timeout=30
    )
    assert init_response.status_code == 200

    send_response = promoted_blueprint_client.post(
        f"{api_base_url}/api/ai-astrologer/message",
        json={"session_id": session_id, "message": "What transit should I watch this week?"},
        timeout=90,
    )
    assert send_response.status_code == 200
    sent_data = send_response.json()
    assert len(sent_data["messages"]) == 2

    read_back_response = promoted_blueprint_client.get(
        f"{api_base_url}/api/ai-astrologer/session/{session_id}", timeout=30
    )
    assert read_back_response.status_code == 200
    read_data = read_back_response.json()
    assert read_data["session_id"] == session_id
    assert isinstance(read_data["messages"], list) and len(read_data["messages"]) == 2
    assert read_data["messages"][0]["content"] == "What transit should I watch this week?"


def test_ai_message_accepts_focus_context_payload(promoted_blueprint_client, api_base_url):
    session_id = f"ai-test-focus-{uuid.uuid4().hex[:8]}"
    focus_context = {
        "id": "placement-venus",
        "kind": "placement",
        "title": "Venus in Pisces",
        "summary": "Venus in Pisces in House 7",
        "prompt": "Explain my Venus placement.",
    }

    response = promoted_blueprint_client.post(
        f"{api_base_url}/api/ai-astrologer/message",
        json={
            "session_id": session_id,
            "message": "Explain this placement in practical terms.",
            "focus_context": focus_context,
        },
        timeout=90,
    )
    assert response.status_code == 200

    data = response.json()
    assert data["session_id"] == session_id
    assert data["messages"][0]["content"] == "Explain this placement in practical terms."
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][1]["role"] == "assistant"
    assert isinstance(data["reply"], str) and len(data["reply"]) > 40
