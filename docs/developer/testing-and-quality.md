# Testing and Quality Checks

This page describes existing test coverage and practical validation commands in the repository.

**Who this page is for:** Developers, QA, and maintainers.

## Existing backend test suites

- `backend/tests/test_api_core.py`
- `backend/tests/test_billing_academy_chart_update.py`
- `backend/tests/test_ai_astrologer.py`
- `backend/tests/test_ai_history_sessions.py`

These tests validate key API and behavior paths using HTTP requests and, in some cases, direct Mongo updates.

## Calculation contract unit tests

These suites run without a database or an external API:

- `backend/tests/test_birth_time.py`: strict civil-time and timezone validation.
- `backend/tests/test_calculation_contract.py`: actual Swiss-library calculations
  compared with upstream `swetest` fixtures, plus backend and failure contracts.
- `backend/tests/test_chart_input_model.py`: API input validation before framework
  normalization can discard precision.
- `backend/tests/test_location_resource.py`: lazy reuse and serialization of the
  existing in-memory timezone lookup resource.
- `backend/tests/test_chart_time_roundtrip.py`: in-process HTTP validation,
  time serialization and persistence through create/read/update/read, and
  rejection without overwriting a saved chart. Database, authentication, and
  calculation dependencies are isolated; this does not verify astronomical
  output or a live MongoDB deployment.

```bash
python -m pip install -c backend/requirements.txt pyswisseph pydantic email-validator tzdata fastapi httpx
python -m unittest discover -s backend/tests -p 'test_birth_time.py' -v
python -m unittest discover -s backend/tests -p 'test_calculation_contract.py' -v
python -m unittest discover -s backend/tests -p 'test_chart_input_model.py' -v
python -m unittest discover -s backend/tests -p 'test_location_resource.py' -v
python -m unittest discover -s backend/tests -p 'test_chart_time_roundtrip.py' -v
```

See the [Profile calculation contract](./profile-calculation-contract.md) and
[reference provenance](../../backend/tests/fixtures/README.md) for the precise
scope of the checks. Agreement with `swetest` does not establish independent
astronomical accuracy or complete file-backed readiness.

## Existing frontend checks

Frontend scripts from `frontend/package.json`:

- `npm start`
- `npm run build`
- `npm test`

Birth-time component regressions live beside `BirthChartEditor` and
`OnboardingPage`. They exercise the actual form controls with mocked API,
navigation, and authentication calls. Coverage includes saved seconds and
microseconds, date/location-only edits, explicit time edits, repeated saves,
missing and legacy approximate times, and invalid-input rejection. The Jest
alias in `craco.config.js` matches the existing webpack `@/` source alias.

```bash
cd frontend
CI=true npm test -- --watchAll=false --runInBand BirthChartEditor.test.jsx OnboardingPage.test.jsx
```

## Recommended local validation sequence

```bash
# Backend
cd backend
python -m pytest tests -q

# Frontend
cd frontend
npm run build
CI=true npm test -- --watch=false
```

## Needs Verification

- In this task environment, test/build commands initially failed due missing local dependencies (`pytest`, `craco`). Maintainers should confirm canonical CI/runtime installation steps for full reproducible validation.

### Birth-time UI correction verification — 2026-11-22

- All 62 tests in the five isolated backend suites listed above passed: the
  existing 59 tests and three new HTTP regression methods. The new methods
  cover 12 precise time values through create/read/update/read, date-only and
  location-only edits, and 30 rejected malformed/missing/unknown-time requests.
- The HTTP checks used FastAPI 0.141.1, Starlette 1.6.0, and Pydantic 2.13.4,
  while `backend/requirements.txt` pins 0.121.0, 0.49.1, and 2.12.5 respectively.
  The suites still need a run with the repository's pinned dependencies.
- Direct checks of the shared JavaScript validator passed 13 accepted and 16
  rejected cases. The changed JavaScript/JSX and component tests parsed with
  esbuild; these checks do not replace component execution or a frontend build.
- The 81 frontend component cases were added but could not execute:
  `npm test` and `npm run build` both stopped at `craco: not found`, and
  dependency registry access was unavailable. Browser interaction checks were
  also blocked by the available environments.

Frontend test execution, the production build, and verification with pinned
backend dependencies remain pending. These results do not close the broader
Profile release gates in the calculation contract.

## Related pages

- [Local Development Setup](../getting-started/local-development.md)
- [Troubleshooting and FAQ](../operations/troubleshooting-faq.md)
