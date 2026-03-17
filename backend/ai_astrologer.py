import logging
import os
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import HTTPException, status


logger = logging.getLogger(__name__)


ALLOWED_TIERS = {"blueprint", "master"}
SUGGESTED_PROMPTS = [
    "What does my Saturn placement say about how I grow through challenge?",
    "How do my Venus and Mars placements shape the way I love and pursue what I want?",
    "What current transit looks most important in my chart right now?",
    "Can you explain one major aspect in my chart like a thoughtful astrologer would?",
]


def can_access_ai(subscription_tier: str) -> bool:
    return subscription_tier in ALLOWED_TIERS


def _format_placement(placement: dict) -> str:
    return (
        f"{placement['name']}: {placement['sign']} {placement['degree']}°"
        f" | house {placement.get('house') or 'n/a'}"
        f" | retrograde: {'yes' if placement.get('retrograde') else 'no'}"
    )


def build_chart_context(user: dict, chart: dict) -> str:
    placements = chart["placements"]
    focus = chart.get("focus", [])
    aspects = chart.get("aspects", [])[:10]
    transits = chart.get("transits", {}).get("aspects", [])[:8]

    placement_lines = [
        _format_placement(placements[name])
        for name in [
            "Sun",
            "Moon",
            "Ascendant",
            "Mercury",
            "Venus",
            "Mars",
            "Jupiter",
            "Saturn",
            "Uranus",
            "Neptune",
            "Pluto",
            "North Node",
            "Midheaven",
        ]
        if placements.get(name)
    ]

    aspect_lines = [
        f"{item['between'][0]} {item['type']} {item['between'][1]} (orb {item['orb']}°)"
        for item in aspects
    ] or ["No major aspect summary available."]

    transit_lines = [
        f"Transit {item['transit']} in {item['transit_sign']} {item['type'].lower()} natal {item['natal']} in {item['natal_sign']} (orb {item['orb']}°)"
        for item in transits
    ] or ["Current transits are relatively quiet."]

    focus_lines = [
        f"House {item['house']} emphasis: {item['topic']} ({item['count']} placements)"
        for item in focus
    ] or ["No unusually concentrated house emphasis."]

    return "\n".join(
        [
            f"Client name: {user['name']}",
            f"Subscription tier: {user['subscription_tier']}",
            f"Birth-time note: {chart['meta']['note']}",
            f"Chart ruler: {chart['chart_ruler']}",
            f"Big Three: Sun {placements['Sun']['sign']}, Moon {placements['Moon']['sign']}, Rising {placements['Ascendant']['sign']}",
            "Key placements:",
            *placement_lines,
            "House focus:",
            *focus_lines,
            "Major natal aspects:",
            *aspect_lines,
            "Current transit layer:",
            *transit_lines,
        ]
    )


def build_system_message(user: dict, chart: dict) -> str:
    chart_context = build_chart_context(user, chart)
    return (
        "You are Ephemeral's AI Astrologer, a reflective and emotionally rich astrologer who explains chart symbolism with warmth, precision, and psychological depth. "
        "Speak like a thoughtful human astrologer, not a generic AI assistant. Use direct references to the user's saved natal chart, houses, aspects, and current transits. "
        "Answer with symbolic depth, emotional nuance, and concrete chart references. Avoid clichés, vague motivational filler, and deterministic fate language. "
        "Never give medical, legal, or financial claims. Frame astrology as insight, pattern language, and reflective guidance. If birth time was approximate, mention that when house or ascendant certainty matters. "
        "Prefer concise but meaningful answers of 2-4 short paragraphs unless the user asks for deeper detail. When helpful, mention one or two relevant chart factors by name.\n\n"
        "Saved natal chart context:\n"
        f"{chart_context}"
    )


def build_focus_prefix(focus_context: dict | None) -> str:
    if not focus_context:
        return ""
    title = focus_context.get("title", "Selected chart point")
    kind = focus_context.get("kind", "chart item")
    summary = focus_context.get("summary", "")
    return (
        "The user has clicked an interactive natal chart element and wants this response anchored to it. "
        f"Selected {kind}: {title}. "
        f"Context summary: {summary}. "
        "Weave this chart point directly into the answer even if the user's wording is brief.\n\n"
    )


async def generate_astrologer_reply(
    user: dict,
    chart: dict,
    session_messages: list[dict],
    session_id: str,
    prompt: str,
    focus_context: dict | None = None,
) -> str:
    try:
        initial_messages = [{"role": "system", "content": build_system_message(user, chart)}]
        initial_messages.extend(
            {"role": item["role"], "content": item["content"]}
            for item in session_messages[-12:]
        )
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=session_id,
            system_message=initial_messages[0]["content"],
            initial_messages=initial_messages,
        ).with_model("openai", "gpt-5.2")
        return await chat.send_message(UserMessage(text=f"{build_focus_prefix(focus_context)}{prompt}"))
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("AI astrologer reply failed for session %s: %s", session_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI Astrologer is temporarily unavailable. Please try again later.",
        ) from exc


def create_session_document(user_id: str, session_id: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": session_id,
        "user_id": user_id,
        "title": "New chart conversation",
        "preview": "",
        "message_count": 0,
        "last_focus_title": None,
        "messages": [],
        "created_at": now,
        "updated_at": now,
    }


def build_session_title(prompt: str, focus_context: dict | None = None) -> str:
    if focus_context and focus_context.get("title"):
        return focus_context["title"]
    compact = " ".join(prompt.strip().split())
    return compact[:72] if len(compact) > 72 else compact


def build_session_preview(reply: str) -> str:
    compact = " ".join(reply.strip().split())
    return compact[:160] if len(compact) > 160 else compact


def serialise_session_list_item(session_doc: dict) -> dict:
    return {
        "session_id": session_doc["id"],
        "title": session_doc.get("title") or "Untitled chart conversation",
        "preview": session_doc.get("preview") or "",
        "updated_at": session_doc.get("updated_at"),
        "message_count": session_doc.get("message_count", len(session_doc.get("messages", []))),
        "last_focus_title": session_doc.get("last_focus_title"),
    }


def serialise_session(session_doc: dict, current_tier: str) -> dict:
    return {
        "session_id": session_doc["id"],
        "title": session_doc.get("title") or "Untitled chart conversation",
        "messages": session_doc.get("messages", []),
        "eligible": can_access_ai(current_tier),
        "current_tier": current_tier,
        "suggested_prompts": SUGGESTED_PROMPTS,
    }