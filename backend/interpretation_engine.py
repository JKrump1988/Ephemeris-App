from typing import Dict, List

from platform_content import TIER_INCLUDED_TOPICS, TIER_LABELS, TIER_SEQUENCE, TIER_TEASERS


PLANET_DOMAINS = {
    "Sun": "identity and conscious purpose",
    "Moon": "emotional needs and instinctive responses",
    "Mercury": "thinking style and communication",
    "Venus": "attachment, taste, and relationship values",
    "Mars": "drive, courage, and conflict style",
    "Jupiter": "growth, faith, and worldview",
    "Saturn": "responsibility, discipline, and maturity",
    "Uranus": "difference, liberation, and disruption",
    "Neptune": "imagination, longing, and sensitivity",
    "Pluto": "depth, transformation, and power",
    "North Node": "future-facing growth",
    "Ascendant": "your visible style and first impression",
    "Midheaven": "public direction and vocational identity",
}

SIGN_VOICES = {
    "Aries": {"style": "direct, initiating, and courageous", "gift": "decisive action", "shadow": "impatience"},
    "Taurus": {"style": "steady, sensual, and deliberate", "gift": "consistency", "shadow": "resistance to change"},
    "Gemini": {"style": "curious, agile, and verbally alive", "gift": "adaptability", "shadow": "scattered attention"},
    "Cancer": {"style": "protective, feeling-led, and receptive", "gift": "emotional intelligence", "shadow": "defensiveness"},
    "Leo": {"style": "warm, expressive, and creatively radiant", "gift": "heart-led confidence", "shadow": "performative pride"},
    "Virgo": {"style": "precise, observant, and improvement-oriented", "gift": "discernment", "shadow": "self-criticism"},
    "Libra": {"style": "relational, aesthetic, and harmonizing", "gift": "social intelligence", "shadow": "indecision"},
    "Scorpio": {"style": "intense, private, and psychologically searching", "gift": "emotional depth", "shadow": "control through vigilance"},
    "Sagittarius": {"style": "expansive, meaning-seeking, and candid", "gift": "vision", "shadow": "restless excess"},
    "Capricorn": {"style": "structured, strategic, and self-governing", "gift": "endurance", "shadow": "emotional reserve"},
    "Aquarius": {"style": "independent, conceptual, and future-oriented", "gift": "originality", "shadow": "detachment"},
    "Pisces": {"style": "porous, imaginative, and spiritually attuned", "gift": "compassion", "shadow": "blurred boundaries"},
}

ASPECT_MEANINGS = {
    "Conjunction": "These two parts of you operate as one theme, intensifying each other.",
    "Sextile": "This pattern opens a useful opportunity when you actively engage it.",
    "Square": "This tension pushes growth by refusing easy avoidance.",
    "Trine": "This flow comes naturally and can become a dependable gift.",
    "Opposition": "This polarity asks you to balance two valid but competing instincts.",
}


def placement_sentence(placement: dict) -> str:
    voice = SIGN_VOICES[placement["sign"]]
    house_text = ""
    if placement.get("house"):
        house_text = f" In house {placement['house']}, it tends to show up through that life area first."
    retrograde_text = " Its energy turns inward first because the planet is retrograde." if placement.get("retrograde") else ""
    return (
        f"{placement['name']} in {placement['sign']} gives your {PLANET_DOMAINS[placement['name']]} a {voice['style']} tone. "
        f"Its gift is {voice['gift']}, while its growth edge can be {voice['shadow']}.{house_text}{retrograde_text}"
    )


def dominant_from_balance(balance: Dict[str, int]) -> str:
    return max(balance.items(), key=lambda item: item[1])[0]


def big_three_summary(chart: dict) -> str:
    sun = chart["placements"]["Sun"]
    moon = chart["placements"]["Moon"]
    rising = chart["placements"].get("Ascendant")
    rising_text = f" while your Rising in {rising['sign']} shapes how others meet you" if rising else ""
    return (
        f"Your Sun in {sun['sign']} centers identity around {SIGN_VOICES[sun['sign']]['gift']}, "
        f"your Moon in {moon['sign']} seeks emotional safety through {SIGN_VOICES[moon['sign']]['style']},{rising_text}."
    )


def aspect_sentences(aspects: List[dict], limit: int = 3) -> List[str]:
    lines = []
    for aspect in aspects[:limit]:
        first, second = aspect["between"]
        lines.append(
            f"{first} {aspect['type'].lower()} {second} (orb {aspect['orb']}°): {ASPECT_MEANINGS[aspect['type']]}"
        )
    return lines


def balance_sentence(balance: dict) -> str:
    dominant_element = dominant_from_balance(balance["elements"])
    dominant_modality = dominant_from_balance(balance["modalities"])
    return (
        f"Your chart leans most strongly toward {dominant_element} energy and a {dominant_modality} mode of action, "
        f"describing the emotional climate that repeats across your chart patterns."
    )


def build_snapshot(chart: dict) -> List[dict]:
    sun = chart["placements"]["Sun"]
    moon = chart["placements"]["Moon"]
    rising = chart["placements"].get("Ascendant")
    sections = [
        {
            "title": "Big Three Synthesis",
            "content": big_three_summary(chart),
            "highlight": f"Sun {sun['sign']} · Moon {moon['sign']}" + (f" · Rising {rising['sign']}" if rising else ""),
        },
        {
            "title": "Identity Tone",
            "content": placement_sentence(sun),
            "highlight": f"{sun['degree']}° {sun['sign']}",
        },
        {
            "title": "Emotional Weather",
            "content": placement_sentence(moon),
            "highlight": f"{moon['degree']}° {moon['sign']}",
        },
    ]
    if rising:
        sections.append(
            {
                "title": "Visible Presence",
                "content": placement_sentence(rising),
                "highlight": f"{rising['degree']}° {rising['sign']}",
            }
        )
    sections.append(
        {
            "title": "Personality Overview",
            "content": (
                f"{balance_sentence(chart['balance'])} The strongest psychological emphasis appears wherever your Big Three and closest aspects keep repeating the same tone."
            ),
            "highlight": "Psychological overview",
        }
    )
    return sections


def build_profile(chart: dict) -> List[dict]:
    sections = build_snapshot(chart)
    for name, title in [("Mercury", "Mind & Communication"), ("Venus", "Attachment & Desire"), ("Mars", "Drive & Conflict Style")]:
        placement = chart["placements"][name]
        sections.append(
            {
                "title": title,
                "content": placement_sentence(placement),
                "highlight": f"{name} in {placement['sign']}",
            }
        )
    sections.append(
        {
            "title": "Element & Modality Balance",
            "content": balance_sentence(chart["balance"]),
            "highlight": "Chart composition",
        }
    )
    sections.append(
        {
            "title": "Personal Planet Aspects",
            "content": " ".join(aspect_sentences(chart["aspects"], limit=4)),
            "highlight": "Relational and mental patterns",
        }
    )
    return sections


def build_blueprint(chart: dict) -> List[dict]:
    sections = build_profile(chart)
    focus_areas = chart.get("focus", [])
    focus_text = "; ".join(
        [f"House {item['house']} carries {item['count']} key placements around {item['topic']}" for item in focus_areas]
    ) or "Your chart emphasis is widely distributed rather than concentrated into one life area."
    sections.extend(
        [
            {
                "title": "Natal Architecture",
                "content": focus_text,
                "highlight": "House concentration",
            },
            {
                "title": "Chart Ruler",
                "content": (
                    f"Your chart ruler is {chart['chart_ruler']} because your Ascendant is in {chart['placements']['Ascendant']['sign']}. "
                    f"This makes {chart['chart_ruler']} a key symbol for how your life path coheres over time."
                ),
                "highlight": chart["chart_ruler"],
            },
            {
                "title": "North Node Direction",
                "content": placement_sentence(chart["north_node"]),
                "highlight": f"North Node in {chart['north_node']['sign']}",
            },
            {
                "title": "Saturn Lessons",
                "content": placement_sentence(chart["saturn"]),
                "highlight": f"Saturn in {chart['saturn']['sign']}",
            },
            {
                "title": "Career Indicators",
                "content": (
                    f"Your Midheaven in {chart['career']['midheaven_sign']} points toward a public role shaped by that sign's style. "
                    f"Saturn in house {chart['career']['saturn_house']} adds the long-term apprenticeship theme, while tenth-house emphasis includes {', '.join(chart['career']['tenth_house_emphasis']) or 'no major planets, so the Midheaven sign itself becomes especially important'}."
                ),
                "highlight": f"Midheaven in {chart['career']['midheaven_sign']}",
            },
        ]
    )
    return sections


def build_master(chart: dict) -> List[dict]:
    sections = build_blueprint(chart)
    transit_aspects = chart["transits"]["aspects"]
    transit_lines = []
    for aspect in transit_aspects[:4]:
        transit_lines.append(
            f"Transit {aspect['transit']} in {aspect['transit_sign']} forms a {aspect['type'].lower()} to your natal {aspect['natal']} in {aspect['natal_sign']} (orb {aspect['orb']}°)."
        )
    sections.extend(
        [
            {
                "title": "Current Transit Climate",
                "content": " ".join(transit_lines) or "Current skies are relatively quiet, which often supports integration rather than disruption.",
                "highlight": "Live transit layer",
            },
            {
                "title": "Upcoming Influences",
                "content": (
                    "The most exact transits deserve attention first. When the same natal point is contacted by multiple planets, that life theme tends to move from background intuition into conscious experience."
                ),
                "highlight": "Influence windows",
            },
            {
                "title": "Timing Cycles",
                "content": (
                    "Fast planets describe mood and immediacy, while Jupiter and Saturn describe growth and restructuring across longer arcs. Use short-term weather as context, not verdict."
                ),
                "highlight": "Short and long cycles",
            },
            {
                "title": "Growth Periods",
                "content": (
                    "Your growth periods arrive where current transits activate natal tensions or gifts. Supportive trines and sextiles help things move; squares and oppositions reveal what can no longer remain unconscious."
                ),
                "highlight": "Reflective guidance",
            },
        ]
    )
    return sections


BUILDERS = {
    "snapshot": build_snapshot,
    "profile": build_profile,
    "blueprint": build_blueprint,
    "master": build_master,
}


def note_for_chart(chart: dict) -> str:
    return chart["meta"]["note"] + " Astrology here is framed as insight, not fate."


def build_reading(chart: dict, tier: str, subscription_tier: str) -> dict:
    sections = BUILDERS[tier](chart)
    accessible = TIER_SEQUENCE.index(tier) <= TIER_SEQUENCE.index(subscription_tier)
    preview_sections = sections if accessible else sections[:2]
    locked_topics = [] if accessible else TIER_INCLUDED_TOPICS[tier]
    return {
        "tier": tier,
        "accessible": accessible,
        "preview": not accessible,
        "title": TIER_LABELS[tier],
        "summary": preview_sections[0]["content"],
        "note": note_for_chart(chart) if accessible else f"{TIER_TEASERS[tier]} Unlock this tier to see the full reading.",
        "sections": preview_sections,
        "locked_topics": locked_topics,
    }


def build_daily_insight(chart: dict) -> dict:
    transit = chart["transits"]["aspects"][0] if chart["transits"]["aspects"] else None
    moon = chart["placements"]["Moon"]
    sun = chart["placements"]["Sun"]
    if transit:
        cosmic_weather = (
            f"Today's sky emphasizes {transit['transit']} in {transit['transit_sign']} as it {transit['type'].lower()}s your natal {transit['natal']}. "
            f"This can bring your usual {transit['natal_sign']} style into sharper awareness."
        )
        personal_note = (
            f"Because your Moon is in {moon['sign']} and your Sun is in {sun['sign']}, you may feel a pull between emotional familiarity and visible action today."
        )
        reflection_prompt = (
            f"Where is today's {transit['transit']} transit asking you to respond with more consciousness instead of habit?"
        )
        highlights = [
            f"Transit {transit['transit']} → natal {transit['natal']} ({transit['type']})",
            f"Sun in {sun['sign']}",
            f"Moon in {moon['sign']}",
        ]
    else:
        cosmic_weather = "The sky is comparatively quiet today, making this a strong moment for integration, reflection, and subtle recalibration."
        personal_note = f"Your Moon in {moon['sign']} benefits from emotional honesty, while your Sun in {sun['sign']} wants a clean sense of direction."
        reflection_prompt = "What already feels true beneath the noise, and how can you trust that signal a little more today?"
        highlights = [f"Sun in {sun['sign']}", f"Moon in {moon['sign']}"]

    return {
        "generated_for": chart["transits"]["generated_at"],
        "cosmic_weather": cosmic_weather,
        "personal_transit_note": personal_note,
        "reflection_prompt": reflection_prompt,
        "highlights": highlights,
        "note": note_for_chart(chart),
    }