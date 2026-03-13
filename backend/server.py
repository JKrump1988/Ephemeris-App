import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging

from academy_content import ACADEMY_CATALOG
from ai_astrologer import can_access_ai, create_session_document, generate_astrologer_reply, serialise_session
from auth_utils import authenticate_user, create_access_token, get_current_user, get_password_hash, set_database
from astrology_engine import generate_natal_chart, search_locations
from interpretation_engine import build_daily_insight, build_reading
from models import (
    AcademyCatalogResponse,
    AstrologerMessageRequest,
    AstrologerMessageResponse,
    AstrologerSessionResponse,
    BillingCatalogResponse,
    ChartCreate,
    ChartResponse,
    CheckoutCreateRequest,
    CheckoutStartResponse,
    CheckoutStatusSyncResponse,
    DailyInsightResponse,
    LocationSearchResponse,
    LoginRequest,
    PlatformOverviewResponse,
    ReadingResponse,
    TokenResponse,
    UserCreate,
    UserPublic,
)
from payments import build_billing_catalog, create_checkout_session_for_tier, get_checkout_client, process_webhook_event, sync_checkout_status
from platform_content import PLATFORM_OVERVIEW, build_tier_access


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
set_database(db)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


def serialise_user(user_doc: dict) -> UserPublic:
    public = {key: value for key, value in user_doc.items() if key != "password_hash"}
    return UserPublic(**public)


async def get_chart_for_user(user_id: str) -> dict:
    chart = await db.charts.find_one({"user_id": user_id}, {"_id": 0})
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saved chart found for this account")
    return chart

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Ephemeral API is live"}


@api_router.post("/auth/register", response_model=TokenResponse)
async def register_user(payload: UserCreate):
    existing = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists")

    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": payload.email.lower(),
        "name": payload.name,
        "password_hash": get_password_hash(payload.password),
        "subscription_tier": "snapshot",
        "has_chart": False,
        "created_at": now,
    }
    await db.users.insert_one(user_doc.copy())

    return TokenResponse(
        access_token=create_access_token(user_doc["id"]),
        expires_in_minutes=int(os.environ["TOKEN_EXPIRE_MINUTES"]),
        user=serialise_user(user_doc),
    )


@api_router.post("/auth/login", response_model=TokenResponse)
async def login_user(payload: LoginRequest):
    user = await authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return TokenResponse(
        access_token=create_access_token(user["id"]),
        expires_in_minutes=int(os.environ["TOKEN_EXPIRE_MINUTES"]),
        user=serialise_user(user),
    )


@api_router.get("/auth/me", response_model=UserPublic)
async def read_current_user(current_user: dict = Depends(get_current_user)):
    return serialise_user(current_user)


@api_router.get("/locations/search", response_model=LocationSearchResponse)
async def location_search(
    q: str = Query(min_length=2, max_length=120),
    current_user: dict = Depends(get_current_user),
):
    _ = current_user
    results = await asyncio.to_thread(search_locations, q)
    return {"query": q, "results": results}


@api_router.post("/chart", response_model=ChartResponse)
async def create_or_update_chart(payload: ChartCreate, current_user: dict = Depends(get_current_user)):
    prepared_chart_input = {
        "birth_date": payload.birth_date.isoformat(),
        "birth_time": payload.birth_time.strftime("%H:%M") if payload.birth_time else None,
        "birth_time_known": payload.birth_time_known,
        "location_name": payload.location_name,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "timezone": payload.timezone,
    }
    chart_data = await asyncio.to_thread(generate_natal_chart, prepared_chart_input)
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.charts.find_one({"user_id": current_user["id"]}, {"_id": 0, "id": 1, "created_at": 1})
    chart_doc = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "user_id": current_user["id"],
        "created_at": existing["created_at"] if existing else now,
        "updated_at": now,
        "birth_date": prepared_chart_input["birth_date"],
        "birth_time": prepared_chart_input["birth_time"],
        "birth_time_known": payload.birth_time_known,
        "location_name": payload.location_name,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "timezone": payload.timezone,
        "chart": chart_data,
    }
    await db.charts.update_one({"user_id": current_user["id"]}, {"$set": chart_doc}, upsert=True)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"has_chart": True}})

    return {
        "id": chart_doc["id"],
        "created_at": chart_doc["created_at"],
        "updated_at": chart_doc["updated_at"],
        "approximate_time_used": chart_data["meta"]["approximate_time_used"],
        "note": chart_data["meta"]["note"],
        "location_name": chart_doc["location_name"],
        "latitude": chart_doc["latitude"],
        "longitude": chart_doc["longitude"],
        "timezone": chart_doc["timezone"],
        "birth_date": chart_doc["birth_date"],
        "birth_time": chart_doc["birth_time"],
        "tier_access": build_tier_access(current_user["subscription_tier"]),
        "chart": chart_doc["chart"],
    }


@api_router.put("/chart/current", response_model=ChartResponse)
async def update_current_chart(payload: ChartCreate, current_user: dict = Depends(get_current_user)):
    return await create_or_update_chart(payload, current_user)


@api_router.get("/chart/current", response_model=ChartResponse)
async def read_current_chart(current_user: dict = Depends(get_current_user)):
    chart_doc = await get_chart_for_user(current_user["id"])
    chart = chart_doc["chart"]
    return {
        "id": chart_doc["id"],
        "created_at": chart_doc["created_at"],
        "updated_at": chart_doc["updated_at"],
        "approximate_time_used": chart["meta"]["approximate_time_used"],
        "note": chart["meta"]["note"],
        "location_name": chart_doc["location_name"],
        "latitude": chart_doc["latitude"],
        "longitude": chart_doc["longitude"],
        "timezone": chart_doc["timezone"],
        "birth_date": chart_doc["birth_date"],
        "birth_time": chart_doc["birth_time"],
        "tier_access": build_tier_access(current_user["subscription_tier"]),
        "chart": chart,
    }


@api_router.get("/readings/{tier}", response_model=ReadingResponse)
async def read_tier_reading(tier: str, current_user: dict = Depends(get_current_user)):
    if tier not in {"snapshot", "profile", "blueprint", "master"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown reading tier")
    chart_doc = await get_chart_for_user(current_user["id"])
    return build_reading(chart_doc["chart"], tier, current_user["subscription_tier"])


@api_router.get("/daily", response_model=DailyInsightResponse)
async def read_daily_insight(current_user: dict = Depends(get_current_user)):
    chart_doc = await get_chart_for_user(current_user["id"])
    return build_daily_insight(chart_doc["chart"])


@api_router.get("/platform/overview", response_model=PlatformOverviewResponse)
async def read_platform_overview():
    return PLATFORM_OVERVIEW


@api_router.get("/billing/tiers", response_model=BillingCatalogResponse)
async def read_billing_tiers(current_user: dict = Depends(get_current_user)):
    return {
        "current_tier": current_user["subscription_tier"],
        "tiers": build_billing_catalog(current_user["subscription_tier"]),
    }


@api_router.post("/billing/checkout/session", response_model=CheckoutStartResponse)
async def create_checkout_session(
    payload: CheckoutCreateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    session, transaction = await create_checkout_session_for_tier(request, payload.origin_url, payload.tier, current_user)
    await db.payment_transactions.insert_one(transaction.copy())
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/billing/checkout/status/{session_id}", response_model=CheckoutStatusSyncResponse)
async def read_checkout_status(session_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    return await sync_checkout_status(db, request, session_id, current_user)


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    payload_bytes = await request.body()
    webhook_response = await get_checkout_client(request).handle_webhook(payload_bytes, request.headers.get("Stripe-Signature"))
    await process_webhook_event(db, webhook_response.model_dump())
    return {"received": True, "event_type": webhook_response.event_type}


@api_router.get("/academy/catalog", response_model=AcademyCatalogResponse)
async def read_academy_catalog(current_user: dict = Depends(get_current_user)):
    _ = current_user
    return ACADEMY_CATALOG


@api_router.get("/ai-astrologer/session/{session_id}", response_model=AstrologerSessionResponse)
async def read_astrologer_session(session_id: str, current_user: dict = Depends(get_current_user)):
    session_doc = await db.ai_astrologer_sessions.find_one(
        {"id": session_id, "user_id": current_user["id"]},
        {"_id": 0},
    )
    if not session_doc:
        session_doc = create_session_document(current_user["id"], session_id)
        await db.ai_astrologer_sessions.insert_one(session_doc.copy())
    return serialise_session(session_doc, current_user["subscription_tier"])


@api_router.post("/ai-astrologer/message", response_model=AstrologerMessageResponse)
async def send_astrologer_message(payload: AstrologerMessageRequest, current_user: dict = Depends(get_current_user)):
    if not can_access_ai(current_user["subscription_tier"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI Astrologer is available for Blueprint and Master tiers.",
        )

    chart_doc = await get_chart_for_user(current_user["id"])
    session_doc = await db.ai_astrologer_sessions.find_one(
        {"id": payload.session_id, "user_id": current_user["id"]},
        {"_id": 0},
    )
    if not session_doc:
        session_doc = create_session_document(current_user["id"], payload.session_id)

    user_message = {
        "role": "user",
        "content": payload.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    session_messages = session_doc.get("messages", [])
    reply = await generate_astrologer_reply(
        current_user,
        chart_doc["chart"],
        session_messages,
        payload.session_id,
        payload.message,
    )
    assistant_message = {
        "role": "assistant",
        "content": reply,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    updated_messages = [*session_messages, user_message, assistant_message]
    now = datetime.now(timezone.utc).isoformat()
    session_doc.update({"messages": updated_messages, "updated_at": now})
    if not session_doc.get("created_at"):
        session_doc["created_at"] = now
    await db.ai_astrologer_sessions.update_one(
        {"id": payload.session_id, "user_id": current_user["id"]},
        {"$set": session_doc},
        upsert=True,
    )

    return {
        "session_id": payload.session_id,
        "reply": reply,
        "messages": updated_messages,
        "current_tier": current_user["subscription_tier"],
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()