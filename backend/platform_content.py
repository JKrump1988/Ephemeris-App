TIER_SEQUENCE = ["snapshot", "profile", "blueprint", "master"]

TIER_LABELS = {
    "snapshot": "Snapshot",
    "profile": "Profile",
    "blueprint": "Blueprint",
    "master": "Master",
}

TIER_INCLUDED_TOPICS = {
    "snapshot": [
        "Sun, Moon, and Rising synthesis",
        "Personality overview",
        "Big Three interaction",
    ],
    "profile": [
        "Mercury, Venus, and Mars patterns",
        "Element and modality balance",
        "Personal planet aspects",
    ],
    "blueprint": [
        "House emphasis and full natal architecture",
        "Chart ruler, North Node, and Saturn lessons",
        "Career indicators and life direction",
    ],
    "master": [
        "Current transits to natal chart",
        "Upcoming planetary influences",
        "Timing cycles and growth periods",
    ],
}

TIER_TEASERS = {
    "snapshot": "Begin with the emotional and symbolic pattern created by your Big Three.",
    "profile": "Reveal how you think, attach, and act by unlocking Mercury, Venus, and Mars.",
    "blueprint": "See the deeper architecture of your chart through houses, karmic direction, and career themes.",
    "master": "Track current transits, unfolding cycles, and the timing of your present growth season.",
}

PLATFORM_OVERVIEW = {
    "system_architecture": [
        "React frontend handles onboarding, dashboard flows, tier pages, and daily insights presentation.",
        "FastAPI backend owns authentication, chart persistence, ephemeris calculations, and reading generation.",
        "MongoDB stores user accounts, saved natal charts, and tier access state for future subscriptions.",
        "Astrology engine and interpretation engine are isolated so new modules can expand without rewriting core logic.",
    ],
    "product_feature_map": [
        "User identity: email/password authentication and saved chart ownership.",
        "Chart intake: birth date, time, and geocoded birth location with timezone handling.",
        "Reading tiers: Snapshot, Profile, Blueprint, and Master all derived from the same chart core.",
        "Daily astrology: current transit-based guidance connected to natal placements.",
        "Future modules: AI Astrologer and Ephemeral Academy slots are planned into the information architecture.",
    ],
    "data_flow": [
        "User creates account and signs in.",
        "User submits birth details and selected birth location.",
        "Backend converts birth input to UTC, calculates natal placements with Swiss ephemeris logic, and stores chart data.",
        "Interpretation engine transforms structured chart data into tiered readings and daily guidance.",
        "Frontend fetches tier-specific reading payloads and renders locked or unlocked experiences based on access level.",
    ],
    "reading_generation_logic": [
        "Snapshot uses Sun, Moon, Rising, and Big Three dynamics to establish identity tone.",
        "Profile expands into Mercury, Venus, Mars, element balance, modality balance, and personal aspects.",
        "Blueprint layers in houses, chart ruler, North Node, Saturn themes, and career signatures.",
        "Master adds real-time transit analysis, influence windows, and growth-cycle framing.",
        "Every interpretation avoids fate language and frames astrology as reflective insight.",
    ],
    "monetization_flow": [
        "Free users receive Snapshot and can preview the emotional tone of deeper tiers.",
        "Profile, Blueprint, and Master are structured as progressive unlocks from the same natal chart foundation.",
        "Tier cards and locked pages are designed to convert curiosity into paid expansion rather than forcing a second intake flow.",
        "Daily insights can later be promoted into a recurring subscription without changing the chart engine.",
    ],
    "ai_astrologer_architecture": [
        "Future AI Astrologer should read from saved natal chart JSON rather than recalculate placements every chat turn.",
        "Conversation prompts should inject natal placements, top aspects, houses, and current transits as context.",
        "Responses should explain symbolism, clarify chart mechanics, and keep safety language non-deterministic.",
        "The assistant can be added as a chat layer on top of existing chart and reading endpoints.",
    ],
    "future_course_integration_structure": [
        "Ephemeral Academy can live as a separate content domain connected to user identity and tier permissions.",
        "Lesson objects should support video embeds, text modules, locked premium lessons, and progress state.",
        "If an external LMS is used later, the frontend only needs embed and progress-sync adapters.",
        "Course recommendations can eventually map to chart themes such as Saturn, Nodes, or relationship signatures.",
    ],
    "safety_framework": [
        "Astrology is presented as reflection, pattern language, and meaning-making rather than fate.",
        "No medical, legal, or financial claims are generated.",
        "Timing language focuses on growth windows, emotional climates, and invitations to awareness.",
    ],
}


def build_tier_access(current_tier: str):
    current_index = TIER_SEQUENCE.index(current_tier)
    access = []
    for tier in TIER_SEQUENCE:
        access.append(
            {
                "tier": tier,
                "label": TIER_LABELS[tier],
                "accessible": TIER_SEQUENCE.index(tier) <= current_index,
                "teaser": TIER_TEASERS[tier],
                "included_topics": TIER_INCLUDED_TOPICS[tier],
            }
        )
    return access