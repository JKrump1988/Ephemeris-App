# Testing and Quality Checks

This page describes existing test coverage and practical validation commands in the repository.

**Who this page is for:** Developers, QA, and maintainers.

## Existing backend test suites

- `backend/tests/test_api_core.py`
- `backend/tests/test_billing_academy_chart_update.py`
- `backend/tests/test_ai_astrologer.py`
- `backend/tests/test_ai_history_sessions.py`
- `backend/tests/test_astrology_engine_ephemeris.py`

These tests validate key API and behavior paths using HTTP requests and, in some cases, direct Mongo updates.

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
