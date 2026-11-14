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

```bash
python -m pip install -c backend/requirements.txt pyswisseph pydantic email-validator tzdata
python -m unittest discover -s backend/tests -p 'test_birth_time.py' -v
python -m unittest discover -s backend/tests -p 'test_calculation_contract.py' -v
python -m unittest discover -s backend/tests -p 'test_chart_input_model.py' -v
python -m unittest discover -s backend/tests -p 'test_location_resource.py' -v
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

## Related pages

- [Local Development Setup](../getting-started/local-development.md)
- [Troubleshooting and FAQ](../operations/troubleshooting-faq.md)
