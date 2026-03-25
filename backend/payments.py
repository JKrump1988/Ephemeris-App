import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Tuple

from fastapi import HTTPException, Request, status
from emergentintegrations.payments.stripe.checkout import CheckoutSessionRequest, StripeCheckout

from platform_content import TIER_LABELS, TIER_SEQUENCE


TIER_PRICING = {
    "profile": {
        "amount": 19.00,
        "currency": "usd",
        "premium_story": "Unlock the private language of Mercury, Venus, and Mars with a richer emotional and relational portrait.",
        "includes": ["Profile reading", "Mercury, Venus, Mars", "Elements + modalities", "Personal aspects"],
    },
    "blueprint": {
        "amount": 39.00,
        "currency": "usd",
        "premium_story": "Step into the architecture of the chart with houses, karmic direction, chart ruler, and vocational themes.",
        "includes": ["Everything in Profile", "Full house system", "Chart ruler + North Node", "Saturn lessons + career indicators"],
    },
    "master": {
        "amount": 79.00,
        "currency": "usd",
        "premium_story": "Open the live transit layer and timing cycles that connect your natal design to the present sky.",
        "includes": ["Everything in Blueprint", "Current transits", "Timing cycles", "Growth period guidance"],
    },
}


def validate_origin(origin_url: str) -> str:
    if not origin_url.startswith("http://") and not origin_url.startswith("https://"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid origin URL")
    return origin_url.rstrip("/")


def build_checkout_urls(origin_url: str, tier: str) -> Tuple[str, str]:
    origin = validate_origin(origin_url)
    success_url = f"{origin}/dashboard?checkout=success&tier={tier}&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/dashboard?checkout=cancel&tier={tier}"
    return success_url, cancel_url


def current_backend_host(request: Request) -> str:
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    if forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}".rstrip("/")
    return str(request.base_url).rstrip("/")


def get_checkout_client(request: Request) -> StripeCheckout:
    webhook_url = f"{current_backend_host(request)}/api/webhook/stripe"
    return StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)


def resolve_tier_upgrade(current_tier: str, target_tier: str) -> str:
    current_index = TIER_SEQUENCE.index(current_tier)
    target_index = TIER_SEQUENCE.index(target_tier)
    return TIER_SEQUENCE[max(current_index, target_index)]


def build_billing_catalog(current_tier: str):
    current_index = TIER_SEQUENCE.index(current_tier)
    catalog = []
    for tier in ["profile", "blueprint", "master"]:
        tier_index = TIER_SEQUENCE.index(tier)
        pricing = TIER_PRICING[tier]
        catalog.append(
            {
                "tier": tier,
                "label": TIER_LABELS[tier],
                "amount": pricing["amount"],
                "currency": pricing["currency"],
                "accessible": tier_index <= current_index,
                "premium_story": pricing["premium_story"],
                "includes": pricing["includes"],
            }
        )
    return catalog


async def create_checkout_session_for_tier(request: Request, origin_url: str, tier: str, user: dict):
    if tier not in TIER_PRICING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That tier is not available for purchase")

    pricing = TIER_PRICING[tier]
    success_url, cancel_url = build_checkout_urls(origin_url, tier)
    metadata = {
        "user_id": user["id"],
        "user_email": user["email"],
        "target_tier": tier,
        "source": "ephemeral_dashboard",
    }

    checkout_request = CheckoutSessionRequest(
        amount=float(pricing["amount"]),
        currency=pricing["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await get_checkout_client(request).create_checkout_session(checkout_request)
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "target_tier": tier,
        "amount": pricing["amount"],
        "currency": pricing["currency"],
        "status": "initiated",
        "payment_status": "pending",
        "metadata": metadata,
        "entitlement_applied": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    return session, transaction


async def sync_checkout_status(db, request: Request, session_id: str, current_user: dict):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment session not found")
    if transaction["user_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This payment session does not belong to the signed-in user")

    checkout_status = await get_checkout_client(request).get_checkout_status(session_id)
    now = datetime.now(timezone.utc).isoformat()
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "status": checkout_status.status,
                "payment_status": checkout_status.payment_status,
                "amount_total": checkout_status.amount_total,
                "currency": checkout_status.currency,
                "metadata": checkout_status.metadata,
                "updated_at": now,
            }
        },
    )

    unlocked = False
    target_tier = checkout_status.metadata.get("target_tier", transaction["target_tier"])
    if checkout_status.payment_status == "paid":
        claim = await db.payment_transactions.update_one(
            {"session_id": session_id, "entitlement_applied": {"$ne": True}},
            {"$set": {"entitlement_applied": True, "processed_at": now}},
        )
        if claim.modified_count:
            user_doc = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "subscription_tier": 1})
            new_tier = resolve_tier_upgrade(user_doc["subscription_tier"], target_tier)
            await db.users.update_one({"id": current_user["id"]}, {"$set": {"subscription_tier": new_tier}})
            unlocked = True

    refreshed_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "subscription_tier": 1})
    return {
        "session_id": session_id,
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "current_tier": refreshed_user["subscription_tier"],
        "target_tier": target_tier,
        "amount_total": checkout_status.amount_total,
        "currency": checkout_status.currency,
        "unlocked": unlocked,
        "message": "Tier access granted." if checkout_status.payment_status == "paid" else "Payment still pending or incomplete.",
    }


async def process_webhook_event(db, webhook_payload: dict):
    session_id = webhook_payload.get("session_id")
    if not session_id:
        return
    now = datetime.now(timezone.utc).isoformat()
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "status": webhook_payload.get("event_type", "webhook_received"),
                "payment_status": webhook_payload.get("payment_status", "pending"),
                "metadata": webhook_payload.get("metadata", {}),
                "updated_at": now,
            }
        },
    )