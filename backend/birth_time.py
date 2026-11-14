"""Resolve explicit local birth times without guessing a missing instant.

Civil dates use YYYY-MM-DD. Times use HH:MM or HH:MM:SS, optionally with
one to six fractional-second digits. ``utc_offset`` uses +/-HH:MM, with
optional :SS for historical zones whose offsets were not whole minutes.
Zone rules come from the runtime's IANA timezone database.

Attaching ZoneInfo alone does not validate gaps or repeated times. See
https://peps.python.org/pep-0495/#strict-invalid-time-checking .
"""

import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class BirthTimeError(ValueError):
    """A supplied birth-time field cannot identify one valid UTC instant."""


_DATE_PATTERN = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
_TIME_PATTERN = re.compile(r"[0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]{1,6})?)?")
_OFFSET_PATTERN = re.compile(r"([+-])([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?")


def parse_birth_time(birth_time: str | None) -> time:
    """Validate the original time text before any framework can round it."""
    if birth_time is None or birth_time == "":
        raise BirthTimeError("birth_time is required; provide an exact local civil time.")
    if not isinstance(birth_time, str) or not _TIME_PATTERN.fullmatch(birth_time):
        raise BirthTimeError(
            "birth_time must use HH:MM or HH:MM:SS with at most six fractional-second "
            "digits and no embedded timezone or UTC offset."
        )
    try:
        return time.fromisoformat(birth_time)
    except ValueError as exc:
        raise BirthTimeError("birth_time has an invalid hour, minute, or second.") from exc


def _parse_offset(value: str | None) -> timedelta | None:
    if value is None:
        return None
    match = _OFFSET_PATTERN.fullmatch(value) if isinstance(value, str) else None
    if not match:
        raise BirthTimeError("utc_offset must use +/-HH:MM, optionally with :SS.")
    sign, hour, minute, second = match.groups()
    hours, minutes, seconds = int(hour), int(minute), int(second or 0)
    if hours > 23 or minutes > 59 or seconds > 59:
        raise BirthTimeError("utc_offset has an invalid hour, minute, or second.")
    offset = timedelta(hours=hours, minutes=minutes, seconds=seconds)
    return -offset if sign == "-" else offset


def _format_offset(offset: timedelta) -> str:
    total_seconds = int(offset.total_seconds())
    sign = "-" if total_seconds < 0 else "+"
    hours, remainder = divmod(abs(total_seconds), 3600)
    minutes, seconds = divmod(remainder, 60)
    result = f"{sign}{hours:02d}:{minutes:02d}"
    return f"{result}:{seconds:02d}" if seconds else result


def resolve_birth_time(
    birth_date: str,
    birth_time: str | None,
    birth_time_known: bool,
    timezone_name: str,
    utc_offset: str | None = None,
) -> datetime:
    """Return one aware UTC datetime, or raise a field-specific BirthTimeError.

    A nonexistent local time is always rejected. A repeated local time requires
    an offset identifying the intended occurrence. Any supplied offset is
    checked against the named timezone, even when the time is unambiguous.
    Unknown times are rejected; noon and other substitute times are never used.
    """
    if type(birth_time_known) is not bool:
        raise BirthTimeError("birth_time_known must be a boolean.")
    if not birth_time_known:
        raise BirthTimeError("An exact birth_time is required; birth_time_known must be true.")
    if not isinstance(birth_date, str) or not _DATE_PATTERN.fullmatch(birth_date):
        raise BirthTimeError("birth_date must use YYYY-MM-DD.")
    try:
        civil_date = date.fromisoformat(birth_date)
    except ValueError as exc:
        raise BirthTimeError("birth_date is not a valid Gregorian calendar date.") from exc

    civil_time = parse_birth_time(birth_time)

    if (
        not isinstance(timezone_name, str)
        or not timezone_name
        or timezone_name in {"localtime", "posixrules"}
        or timezone_name.startswith(("posix/", "right/"))
    ):
        raise BirthTimeError("timezone must be an explicit IANA timezone name.")
    try:
        local_zone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise BirthTimeError("timezone is not an available IANA timezone name.") from exc
    requested_offset = _parse_offset(utc_offset)
    local_time = datetime.combine(civil_date, civil_time)

    # UTC keys deduplicate ordinary times, for which fold=0 and fold=1 are
    # equivalent. Both fold candidates fail this round trip during a gap.
    candidates: dict[datetime, timedelta] = {}
    for fold in (0, 1):
        candidate = local_time.replace(tzinfo=local_zone, fold=fold)
        try:
            utc_time = candidate.astimezone(timezone.utc)
            round_trip = utc_time.astimezone(local_zone)
        except OverflowError as exc:
            raise BirthTimeError(
                "birth_date and birth_time exceed the supported UTC datetime range in this timezone."
            ) from exc
        if round_trip.replace(tzinfo=None) == local_time:
            candidates[utc_time] = round_trip.utcoffset()

    if not candidates:
        raise BirthTimeError("birth_time is nonexistent in this timezone because the local clock moved forward.")
    valid_offsets = ", ".join(_format_offset(candidates[instant]) for instant in sorted(candidates))
    if requested_offset is not None:
        for instant, actual_offset in candidates.items():
            if requested_offset == actual_offset:
                return instant
        raise BirthTimeError(
            f"utc_offset does not match this birth_time and timezone; valid offset(s): {valid_offsets}."
        )
    if len(candidates) > 1:
        raise BirthTimeError(
            f"birth_time is ambiguous in this timezone; provide utc_offset as one of: {valid_offsets}."
        )
    return next(iter(candidates))
