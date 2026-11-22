"""Explicit Swiss Ephemeris backend policy and serialized calculation sessions.

The default requires external Swiss files. Moshier is an explicit diagnostic
mode, never a silent substitute. Backend agreement is not an independent
astronomical accuracy certification.
"""

import hashlib
import math
import os
from contextlib import contextmanager
from dataclasses import dataclass
from importlib import metadata
from pathlib import Path
from threading import RLock

import swisseph as swe


class EphemerisUnavailableError(RuntimeError):
    """The selected calculation backend cannot produce the requested chart."""


_LOCK = RLock()
_BACKEND_MASK = swe.FLG_JPLEPH | swe.FLG_SWIEPH | swe.FLG_MOSEPH
_BACKEND_NAMES = {
    swe.FLG_JPLEPH: "jpl",
    swe.FLG_SWIEPH: "swiss",
    swe.FLG_MOSEPH: "moshier",
}


@dataclass(frozen=True)
class EphemerisSettings:
    backend: str
    path: Path | None

    @property
    def flags(self) -> int:
        backend_flag = swe.FLG_SWIEPH if self.backend == "swiss" else swe.FLG_MOSEPH
        return backend_flag | swe.FLG_SPEED


def load_settings() -> EphemerisSettings:
    backend = os.environ.get("EPHEMERIS_BACKEND", "swiss").strip().lower()
    if backend not in {"swiss", "moshier"}:
        raise EphemerisUnavailableError("EPHEMERIS_BACKEND must be swiss or moshier.")
    explicit_path = os.environ.get("EPHEMERIS_PATH", "").strip()
    upstream_path = os.environ.get("SE_EPHE_PATH", "").strip()
    if explicit_path and upstream_path and explicit_path != upstream_path:
        raise EphemerisUnavailableError("EPHEMERIS_PATH and SE_EPHE_PATH must identify the same directory.")
    path_text = explicit_path or upstream_path
    path = Path(path_text) if path_text else None
    if path is not None and (not path.is_absolute() or not path.is_dir()):
        raise EphemerisUnavailableError("The ephemeris data path must be an existing absolute directory.")
    if backend == "swiss" and path is None:
        raise EphemerisUnavailableError("File-backed Swiss Ephemeris requires EPHEMERIS_PATH with planetary and lunar data files.")
    return EphemerisSettings(backend, path)


@contextmanager
def ephemeris_session():
    """Keep global library settings and file caches inside one serialized chart.

Configuration is deployment-owned, never supplied by an API caller. This lock
also covers the API's worker threads. Separate processes are required before
adding per-request paths, zodiac settings, or parallel computation.
    """
    settings = load_settings()
    with _LOCK:
        swe.close()
        swe.set_ephe_path(str(settings.path) if settings.path else "")
        try:
            yield settings
        finally:
            swe.close()


def calculate_body(jd_ut: float, body: int, name: str, flags: int):
    try:
        values, returned_flags = swe.calc_ut(jd_ut, body, flags)
    except swe.Error as exc:
        raise EphemerisUnavailableError(f"The selected ephemeris cannot calculate {name} for this date.") from exc
    requested_backend = flags & _BACKEND_MASK
    effective_backend = returned_flags & _BACKEND_MASK
    if effective_backend != requested_backend:
        requested_name = _BACKEND_NAMES.get(requested_backend, "unknown")
        effective_name = _BACKEND_NAMES.get(effective_backend, "unknown")
        raise EphemerisUnavailableError(
            f"{name} requested {requested_name} but returned {effective_name}; fallback is not permitted."
        )
    if not returned_flags & swe.FLG_SPEED:
        raise EphemerisUnavailableError(f"Longitude speed was not returned for {name}.")
    if len(values) != 6 or not all(math.isfinite(value) for value in values):
        raise EphemerisUnavailableError(f"The ephemeris returned invalid coordinates for {name}.")
    return values, returned_flags


def calculation_metadata(settings: EphemerisSettings, placements: dict, jd_tt: float) -> dict:
    files = []
    if settings.backend == "swiss":
        # A nonempty filename can describe an attempted but failed file open.
        # Require loaded planetary AND lunar coverage, not only returned flags.
        for slot, kind in ((0, "planetary"), (1, "lunar")):
            try:
                filename, start_jd, end_jd, de_number = swe.get_current_file_data(slot)
            except (swe.Error, AttributeError) as exc:
                raise EphemerisUnavailableError("Loaded ephemeris file provenance is unavailable.") from exc
            if not filename or de_number <= 0 or not start_jd <= jd_tt <= end_jd:
                raise EphemerisUnavailableError(f"A loaded {kind} ephemeris file covering this date is required.")
            try:
                file_path = Path(filename)
                digest = hashlib.sha256(file_path.read_bytes()).hexdigest()
            except OSError as exc:
                raise EphemerisUnavailableError(f"The loaded {kind} ephemeris file could not be verified.") from exc
            files.append({
                "kind": kind,
                "name": file_path.name,
                "sha256": digest,
                "start_jd": start_jd,
                "end_jd": end_jd,
                "jpl_de_number": de_number,
            })
    try:
        binding_version = metadata.version("pyswisseph")
    except metadata.PackageNotFoundError:
        binding_version = None
    per_body_flags = {
        name: value["calculation_flags"]
        for name, value in placements.items()
        if value.get("source") == "calculated"
    }
    return {
        "engine": "Swiss Ephemeris",
        "binding": "pyswisseph",
        "binding_package_version": binding_version,
        "binding_build": getattr(swe, "__version__", None),
        "library_version": swe.version,
        "backend_requested": settings.backend,
        "backend_effective": settings.backend,
        "requested_flags": settings.flags,
        "returned_flags": per_body_flags,
        "fallback_permitted": False,
        "data_files": files,
        "zodiac": "tropical",
        "reference_frame": "geocentric ecliptic of date",
        "house_system": "Placidus",
        "house_assignment_method": "ecliptic longitude intervals",
        "calendar": "proleptic Gregorian",
    }
