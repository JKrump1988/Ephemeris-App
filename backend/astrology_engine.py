from datetime import datetime, timezone
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

import requests
import swisseph as swe
from timezonefinder import TimezoneFinder


tf = TimezoneFinder(in_memory=True)
EPHEMERIS_FLAGS = swe.FLG_MOSEPH | swe.FLG_SPEED

SIGNS = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

SIGN_TO_ELEMENT = {
    "Aries": "Fire",
    "Leo": "Fire",
    "Sagittarius": "Fire",
    "Taurus": "Earth",
    "Virgo": "Earth",
    "Capricorn": "Earth",
    "Gemini": "Air",
    "Libra": "Air",
    "Aquarius": "Air",
    "Cancer": "Water",
    "Scorpio": "Water",
    "Pisces": "Water",
}

SIGN_TO_MODALITY = {
    "Aries": "Cardinal",
    "Cancer": "Cardinal",
    "Libra": "Cardinal",
    "Capricorn": "Cardinal",
    "Taurus": "Fixed",
    "Leo": "Fixed",
    "Scorpio": "Fixed",
    "Aquarius": "Fixed",
    "Gemini": "Mutable",
    "Virgo": "Mutable",
    "Sagittarius": "Mutable",
    "Pisces": "Mutable",
}

SIGN_RULERS = {
    "Aries": "Mars",
    "Taurus": "Venus",
    "Gemini": "Mercury",
    "Cancer": "Moon",
    "Leo": "Sun",
    "Virgo": "Mercury",
    "Libra": "Venus",
    "Scorpio": "Pluto",
    "Sagittarius": "Jupiter",
    "Capricorn": "Saturn",
    "Aquarius": "Uranus",
    "Pisces": "Neptune",
}

HOUSE_TOPICS = {
    1: "identity, presence, and how you enter the world",
    2: "security, resources, and what grounds your value",
    3: "mindset, language, and immediate environment",
    4: "roots, family memory, and emotional foundations",
    5: "creativity, romance, and self-expression",
    6: "rituals, wellbeing, and the craft of daily life",
    7: "partnership, mirroring, and relational truth",
    8: "intimacy, transformation, and psychological depth",
    9: "meaning, learning, and worldview expansion",
    10: "career, vocation, and public reputation",
    11: "community, friendships, and future vision",
    12: "solitude, surrender, and the unconscious inner world",
}

PLANET_CODES = [
    ("Sun", swe.SUN),
    ("Moon", swe.MOON),
    ("Mercury", swe.MERCURY),
    ("Venus", swe.VENUS),
    ("Mars", swe.MARS),
    ("Jupiter", swe.JUPITER),
    ("Saturn", swe.SATURN),
    ("Uranus", swe.URANUS),
    ("Neptune", swe.NEPTUNE),
    ("Pluto", swe.PLUTO),
    ("North Node", swe.TRUE_NODE),
]

TRANSIT_CODES = [planet for planet in PLANET_CODES if planet[0] != "North Node"]

ASPECTS = [
    {"name": "Conjunction", "angle": 0, "orb": 8},
    {"name": "Sextile", "angle": 60, "orb": 4},
    {"name": "Square", "angle": 90, "orb": 6},
    {"name": "Trine", "angle": 120, "orb": 6},
    {"name": "Opposition", "angle": 180, "orb": 8},
]


def ensure_swiss_ephemeris_ready() -> None:
    required_attributes = ("calc_ut", "houses_ex", "julday", "FLG_MOSEPH", "FLG_SPEED")
    missing_attributes = [name for name in required_attributes if not hasattr(swe, name)]
    if missing_attributes:
        raise RuntimeError(
            "Swiss Ephemeris is required for this application. Missing attributes: "
            + ", ".join(missing_attributes)
        )


def swiss_ephemeris_contract() -> dict:
    return {
        "engine": "Swiss Ephemeris (pyswisseph)",
        "mode": "Moshier",
        "flags": ["FLG_MOSEPH", "FLG_SPEED"],
    }


def sign_from_longitude(longitude: float) -> str:
    return SIGNS[int(longitude // 30) % 12]


def degree_in_sign(longitude: float) -> float:
    return round(longitude % 30, 2)


def normalize(longitude: float) -> float:
    return longitude % 360


def house_for_longitude(longitude: float, cusps: List[float]) -> int:
    target = normalize(longitude)
    expanded = [normalize(cusp) for cusp in cusps]
    for index in range(12):
        start = expanded[index]
        end = expanded[(index + 1) % 12]
        end_adjusted = end if end > start else end + 360
        target_adjusted = target if target >= start else target + 360
        if start <= target_adjusted < end_adjusted:
            return index + 1
    return 12


def angular_distance(a: float, b: float) -> float:
    diff = abs(a - b) % 360
    return diff if diff <= 180 else 360 - diff


def decimal_hours(moment: datetime) -> float:
    return moment.hour + moment.minute / 60 + moment.second / 3600


def build_utc_datetime(birth_date: str, birth_time: Optional[str], birth_time_known: bool, timezone_name: str):
    if birth_time_known and birth_time:
        local_dt = datetime.fromisoformat(f"{birth_date}T{birth_time}:00")
        aware_local = local_dt.replace(tzinfo=ZoneInfo(timezone_name))
        utc_dt = aware_local.astimezone(timezone.utc)
        approximate = False
    else:
        utc_dt = datetime.fromisoformat(f"{birth_date}T12:00:00+00:00")
        approximate = True
    return utc_dt, approximate


def planet_payload(name: str, longitude: float, speed: float, house: Optional[int]):
    return {
        "name": name,
        "longitude": round(normalize(longitude), 4),
        "sign": sign_from_longitude(longitude),
        "degree": degree_in_sign(longitude),
        "retrograde": speed < 0,
        "house": house,
    }


def calculate_placements(jd_ut: float, cusps: Optional[List[float]] = None) -> Dict[str, dict]:
    placements = {}
    for name, code in PLANET_CODES:
        values, _ = swe.calc_ut(jd_ut, code, EPHEMERIS_FLAGS)
        house = house_for_longitude(values[0], cusps) if cusps else None
        placements[name] = planet_payload(name, values[0], values[3], house)

    south_longitude = normalize(placements["North Node"]["longitude"] + 180)
    placements["South Node"] = planet_payload("South Node", south_longitude, 0.0, house_for_longitude(south_longitude, cusps) if cusps else None)
    return placements


def calculate_houses(jd_ut: float, latitude: float, longitude: float):
    cusps, ascmc = swe.houses_ex(jd_ut, latitude, longitude, b"P")
    house_cusps = [round(cusp, 4) for cusp in cusps]
    asc = ascmc[0]
    mc = ascmc[1]
    return {
        "cusps": house_cusps,
        "ascendant": {
            "longitude": round(normalize(asc), 4),
            "sign": sign_from_longitude(asc),
            "degree": degree_in_sign(asc),
        },
        "midheaven": {
            "longitude": round(normalize(mc), 4),
            "sign": sign_from_longitude(mc),
            "degree": degree_in_sign(mc),
        },
    }


def calculate_aspects(placements: Dict[str, dict]) -> List[dict]:
    keys = [
        "Sun",
        "Moon",
        "Mercury",
        "Venus",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
        "Pluto",
        "North Node",
    ]
    aspects = []
    for index, first_key in enumerate(keys):
        for second_key in keys[index + 1 :]:
            first = placements[first_key]
            second = placements[second_key]
            diff = angular_distance(first["longitude"], second["longitude"])
            for aspect in ASPECTS:
                orb = abs(diff - aspect["angle"])
                if orb <= aspect["orb"]:
                    aspects.append(
                        {
                            "between": [first_key, second_key],
                            "type": aspect["name"],
                            "orb": round(orb, 2),
                            "exact_angle": round(diff, 2),
                        }
                    )
                    break
    return sorted(aspects, key=lambda item: item["orb"])


def calculate_balance(placements: Dict[str, dict]) -> Dict[str, Dict[str, int]]:
    tracked = [
        placements["Sun"],
        placements["Moon"],
        placements["Mercury"],
        placements["Venus"],
        placements["Mars"],
        placements["Jupiter"],
        placements["Saturn"],
        placements["Uranus"],
        placements["Neptune"],
        placements["Pluto"],
    ]
    if placements.get("Ascendant"):
        tracked.append(placements["Ascendant"])

    element_balance = {key: 0 for key in ["Fire", "Earth", "Air", "Water"]}
    modality_balance = {key: 0 for key in ["Cardinal", "Fixed", "Mutable"]}
    for placement in tracked:
        sign = placement["sign"]
        element_balance[SIGN_TO_ELEMENT[sign]] += 1
        modality_balance[SIGN_TO_MODALITY[sign]] += 1
    return {"elements": element_balance, "modalities": modality_balance}


def chart_focus(placements: Dict[str, dict]) -> List[dict]:
    counts = {str(number): 0 for number in range(1, 13)}
    for placement in placements.values():
        house = placement.get("house")
        if house:
            counts[str(house)] += 1
    sorted_counts = sorted(counts.items(), key=lambda item: item[1], reverse=True)
    return [
        {"house": int(house), "count": count, "topic": HOUSE_TOPICS[int(house)]}
        for house, count in sorted_counts[:3]
        if count > 0
    ]


def build_transits(natal_placements: Dict[str, dict]) -> Dict[str, List[dict]]:
    ensure_swiss_ephemeris_ready()
    now = datetime.now(timezone.utc)
    jd_now = swe.julday(now.year, now.month, now.day, decimal_hours(now))

    transits = {}
    for name, code in TRANSIT_CODES:
        values, _ = swe.calc_ut(jd_now, code, EPHEMERIS_FLAGS)
        transits[name] = planet_payload(name, values[0], values[3], None)

    transit_aspects = []
    watched_natal = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Saturn", "Ascendant"]
    for transit_name, transit in transits.items():
        for natal_name in watched_natal:
            natal = natal_placements.get(natal_name)
            if not natal:
                continue
            diff = angular_distance(transit["longitude"], natal["longitude"])
            for aspect in ASPECTS:
                orb = abs(diff - aspect["angle"])
                if orb <= aspect["orb"]:
                    transit_aspects.append(
                        {
                            "transit": transit_name,
                            "natal": natal_name,
                            "type": aspect["name"],
                            "orb": round(orb, 2),
                            "transit_sign": transit["sign"],
                            "natal_sign": natal["sign"],
                        }
                    )
                    break
    return {
        "positions": list(transits.values()),
        "aspects": sorted(transit_aspects, key=lambda item: item["orb"])[:8],
        "generated_at": now.isoformat(),
    }


def search_locations(query: str) -> List[dict]:
    response = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": query, "format": "jsonv2", "limit": 6},
        headers={"User-Agent": "EphemeralAstrology/1.0"},
        timeout=15,
    )
    response.raise_for_status()
    locations = []
    for item in response.json():
        latitude = float(item["lat"])
        longitude = float(item["lon"])
        timezone_name = tf.timezone_at(lng=longitude, lat=latitude)
        if not timezone_name:
            continue
        address = item.get("address", {})
        country = address.get("country")
        locations.append(
            {
                "id": str(item.get("place_id", f"{latitude}-{longitude}")),
                "label": item.get("display_name", query),
                "latitude": latitude,
                "longitude": longitude,
                "timezone": timezone_name,
                "country": country,
            }
        )
    return locations


def generate_natal_chart(chart_input: dict) -> dict:
    ensure_swiss_ephemeris_ready()
    utc_dt, approximate = build_utc_datetime(
        chart_input["birth_date"],
        chart_input.get("birth_time"),
        chart_input["birth_time_known"],
        chart_input["timezone"],
    )

    jd_ut = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, decimal_hours(utc_dt))
    houses = calculate_houses(jd_ut, chart_input["latitude"], chart_input["longitude"])
    placements = calculate_placements(jd_ut, houses["cusps"])
    placements["Ascendant"] = {
        "name": "Ascendant",
        **houses["ascendant"],
        "retrograde": False,
        "house": 1,
    }
    placements["Midheaven"] = {
        "name": "Midheaven",
        **houses["midheaven"],
        "retrograde": False,
        "house": 10,
    }

    aspects = calculate_aspects(placements)
    balance = calculate_balance(placements)
    transits = build_transits(placements)

    chart_ruler = SIGN_RULERS[placements["Ascendant"]["sign"]]
    saturn = placements["Saturn"]
    north_node = placements["North Node"]
    focus = chart_focus(placements)

    note = (
        "Birth time was unavailable, so Ephemeral used 12:00 UT. Ascendant and houses are approximate."
        if approximate
        else "Birth time was used to calculate houses and the Ascendant."
    )

    return {
        "meta": {
            "utc_datetime": utc_dt.isoformat(),
            "local_timezone": chart_input["timezone"],
            "approximate_time_used": approximate,
            "note": note,
            "calculation_engine": swiss_ephemeris_contract(),
        },
        "placements": placements,
        "houses": houses,
        "aspects": aspects,
        "balance": balance,
        "focus": focus,
        "chart_ruler": chart_ruler,
        "north_node": north_node,
        "saturn": saturn,
        "transits": transits,
        "career": {
            "midheaven_sign": placements["Midheaven"]["sign"],
            "saturn_house": saturn.get("house"),
            "saturn_sign": saturn["sign"],
            "tenth_house_emphasis": [
                placement["name"]
                for placement in placements.values()
                if placement.get("house") == 10 and placement["name"] not in {"Ascendant", "Midheaven"}
            ],
        },
    }
