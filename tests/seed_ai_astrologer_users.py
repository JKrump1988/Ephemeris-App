"""Seed snapshot + blueprint users (with charts) for frontend AI astrologer regression testing."""

import json
import os
import uuid
from pathlib import Path

import requests
from pymongo import MongoClient


def resolve_env_value(file_path: Path, key: str) -> str | None:
    if not file_path.exists():
        return None
    for line in file_path.read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip('"')
    return None


def resolve_base_url() -> str:
    env_url = os.environ.get("REACT_APP_BACKEND_URL")
    if env_url:
        return env_url.rstrip("/")

    frontend_env = Path("/app/frontend/.env")
    value = resolve_env_value(frontend_env, "REACT_APP_BACKEND_URL")
    if not value:
        raise RuntimeError("REACT_APP_BACKEND_URL is not configured")
    return value.rstrip("/")


def register_and_seed_chart(session: requests.Session, base_url: str, email: str, name: str, password: str) -> None:
    register_response = session.post(
        f"{base_url}/api/auth/register",
        json={"email": email, "name": name, "password": password},
        timeout=30,
    )
    register_response.raise_for_status()
    token = register_response.json()["access_token"]

    authed = requests.Session()
    authed.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})

    location_response = authed.get(f"{base_url}/api/locations/search", params={"q": "New York"}, timeout=30)
    location_response.raise_for_status()
    location = location_response.json()["results"][0]

    chart_payload = {
        "birth_date": "1991-04-19",
        "birth_time": "08:30",
        "birth_time_known": True,
        "location_name": location["label"],
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "timezone": location["timezone"],
    }
    chart_response = authed.post(f"{base_url}/api/chart", json=chart_payload, timeout=60)
    chart_response.raise_for_status()


def main():
    base_url = resolve_base_url()
    backend_env = Path("/app/backend/.env")
    mongo_url = os.environ.get("MONGO_URL") or resolve_env_value(backend_env, "MONGO_URL")
    db_name = os.environ.get("DB_NAME") or resolve_env_value(backend_env, "DB_NAME")
    if not mongo_url or not db_name:
        raise RuntimeError("MONGO_URL/DB_NAME not configured")

    unique = uuid.uuid4().hex[:8]
    snapshot_email = f"test_ui_snapshot_{unique}@example.com"
    blueprint_email = f"test_ui_blueprint_{unique}@example.com"
    password = "TestPass123!"

    public_session = requests.Session()
    public_session.headers.update({"Content-Type": "application/json"})

    register_and_seed_chart(public_session, base_url, snapshot_email, f"TEST UI Snapshot {unique}", password)
    register_and_seed_chart(public_session, base_url, blueprint_email, f"TEST UI Blueprint {unique}", password)

    mongo_client = MongoClient(mongo_url)
    try:
        db = mongo_client[db_name]
        update_result = db.users.update_one(
            {"email": blueprint_email},
            {"$set": {"subscription_tier": "blueprint"}},
        )
        if update_result.matched_count != 1:
            raise RuntimeError("Failed to promote blueprint user")
    finally:
        mongo_client.close()

    output = {
        "base_url": base_url,
        "snapshot": {"email": snapshot_email, "password": password},
        "blueprint": {"email": blueprint_email, "password": password},
    }
    Path("/app/tests/seed_ai_users.json").write_text(json.dumps(output))
    print(json.dumps(output))


if __name__ == "__main__":
    main()
