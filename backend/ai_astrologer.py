import os
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage


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


async def generate_astrologer_reply(user: dict, chart: dict, session_messages: list[dict], session_id: str, prompt: str) -> str:
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
    return await chat.send_message(UserMessage(text=prompt))


def create_session_document(user_id: str, session_id: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": session_id,
        "user_id": user_id,
        "messages": [],
        "created_at": now,
        "updated_at": now,
    }


def serialise_session(session_doc: dict, current_tier: str) -> dict:
    return {
        "session_id": session_doc["id"],
        "messages": session_doc.get("messages", []),
        "eligible": can_access_ai(current_tier),
        "current_tier": current_tier,
        "suggested_prompts": SUGGESTED_PROMPTS,
    }