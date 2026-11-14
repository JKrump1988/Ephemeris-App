# Profile calculation contract: first implementation slice

Status: proposed implementation for the Profile MVP, not a ratification of new
product Canon. This change concerns astronomical calculation and validation;
it does not complete the locked Identity Profile reading workflow.

## Why this change is needed

The inspected main branch used `FLG_MOSEPH | FLG_SPEED`, discarded each
calculation's returned flags, silently selected the first occurrence of a
repeated local time, and substituted 12:00 UT for an unknown birth time. It also
rounded house cusps before assigning houses and assigned zero speed to the
derived South Node. Those behaviors prevent a clear, reproducible calculation
contract. Moshier itself is a supported Swiss Ephemeris-library backend;
its use alone does not prove inaccurate planetary results.

## Behavior implemented

1. Birth date, exact local civil time, explicit IANA timezone, latitude, and
   longitude are required. Missing time is an input error, with no noon
   substitute. Date and time precision is retained through the HTTP handoff.
2. Both possible timezone folds are checked by a UTC round trip. Nonexistent
   times are rejected. Repeated times require `utc_offset`, such as `-07:00`
   or `-08:00`. A supplied offset must agree with the named timezone.
3. Latitude/longitude must be finite and within their geographic ranges.
   This slice retains and declares the app's tropical zodiac, geocentric
   ecliptic-of-date coordinates, and Placidus houses.
4. `utc_to_jd` supplies TT and UT1 Julian dates. The record discloses the
   library's pre-1972 convention, which treats those civil UTC inputs as UT1.
5. The deployment explicitly selects its ephemeris backend. The proposed
   default is file-backed `swiss`; `moshier` remains available for diagnostics
   and comparison. Every computed body must return the requested backend and
   longitude-speed flag. Silent backend fallback is rejected.
6. File-backed charts additionally require actually loaded planetary and lunar
   files with positive DE identifiers and date coverage. A path naming an
   attempted file open does not count as evidence of a successful load. File
   hashes and coverage are recorded with the result.
7. Raw numeric precision is retained for placements, house membership, and
   downstream aspect calculations. The South Node is explicitly derived as
   North Node + 180 degrees and inherits its longitude speed and retrograde
   status. This is not a separately calculated astronomical body.
8. A Placidus calculation error is returned as a field error; no other house
   system is silently substituted. Global Swiss settings and file caches are
   serialized for each chart. Per-request path or sidereal configuration would
   require a separate design using process isolation.
9. Metadata records the binding distribution version, binding build, Swiss
   library version, requested backend, effective backend, per-body returned
   flags, calculation conventions, UTC instant, and Julian dates.

The existing API returns HTTP 422 for invalid chart input or unavailable
Placidus houses, and HTTP 503 for an unavailable required calculation backend.
The database is written only after a successful calculation.

## Configuration

For file-backed operation, provision the official files covering the intended
dates, then set `EPHEMERIS_BACKEND=swiss` and `EPHEMERIS_PATH` to their absolute
directory. For 1800–2399, the planetary and lunar file names are `sepl_18.se1`
and `semo_18.se1`; successful loaded-file metadata remains authoritative for
actual coverage. `SE_EPHE_PATH`, if also set, must agree with `EPHEMERIS_PATH`.

To run the reference-executable comparison tests, select Moshier explicitly.
The tests isolate their environment and never treat its results as file-backed
Swiss calculations.

## Verification

The new unit suites do not contact production services or require a database:

```bash
python -m pip install -c backend/requirements.txt pyswisseph pydantic email-validator tzdata
python -m unittest discover -s backend/tests -p 'test_birth_time.py' -v
python -m unittest discover -s backend/tests -p 'test_calculation_contract.py' -v
python -m unittest discover -s backend/tests -p 'test_chart_input_model.py' -v
python -m unittest discover -s backend/tests -p 'test_location_resource.py' -v
```

Reference values come from the upstream `swetest` executable, not from the
application. The fixture preserves three synthetic cases, all eleven computed
bodies, twelve house cusps, Ascendant, Midheaven, source provenance, exact
commands, and raw-output hashes. See [fixture provenance](../../backend/tests/fixtures/README.md).

The comparison establishes agreement with the upstream executable using the
same Swiss Ephemeris astronomy library. It is not independent astronomical
validation. Tests for deliberately missing files verify rejection behavior;
passing those tests does not demonstrate a complete file-backed chart.

The recorded [verification results](./profile-calculation-verification.json)
include the runtime versions, 59 passing tests, reference differences, and
the actual incomplete-file rejection observed during this implementation.

## Completion gate and remaining work

This first slice is done when the new unit/reference suites pass, backend
fallback is rejected, the public API preserves exact times and offsets, and
the evidence/limitations are documented. It is delivered for review.

The Profile MVP is not release-verified until a provisioned runtime passes
complete file-backed reference cases with matching data-file manifests; the
API and UI pass isolated integration tests; ambiguous times can be resolved in
the input UI; and legacy stored charts are regenerated or explicitly marked
unverified. Broader independent astronomical comparison needs an aligned
reference system and justified tolerances before it can become a release gate.

The legacy response still includes time-dependent current-transit content.
The reproducibility checks concern the natal facts. Separating that legacy
content from the Profile response is a subsequent integration decision.

### Material rollout changes

- Deployments without configured Swiss planetary and lunar files will receive
  HTTP 503 for new chart calculations unless they deliberately select the
  labeled Moshier mode. The draft is not ready for an automatic production rollout.
- Unknown birth times are now rejected for new calculations. Existing stored
  charts are not retroactively recalculated by this patch.
- The API accepts an optional `utc_offset` and returns the supplied value with
  a saved chart. The input UI still needs an offset-selection control and an
  update to its former unknown-time option before release.
- Longitude/degree values now retain precision. Display formatting belongs in
  the client; clients should not rely on a fixed count of decimal places.

## Primary technical sources

- [Swiss Ephemeris programming interface](https://www.astro.com/swisseph/swephprg.htm):
  returned flags, time conversion, loaded-file metadata, and house errors.
- [Swiss Ephemeris technical documentation](https://www.astro.com/swisseph/swisseph.htm):
  backend definitions and model limitations.
- [Python PEP 495](https://peps.python.org/pep-0495/): ambiguous and missing civil times;
  attaching timezone information alone is not strict validation.

Numerical astronomy and psychological interpretation remain separate claims.
No test in this change establishes personality accuracy or subjective resonance.
