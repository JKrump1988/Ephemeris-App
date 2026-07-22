# Codebase Structure

This page maps the key directories and ownership boundaries in the repository.

**Who this page is for:** Developers and maintainers.

## Top-level layout

- `/backend` — FastAPI app, auth, chart engine, interpretation, billing, AI logic, tests
- `/frontend` — React UI routes, shared components, API client, auth/chat context
- `/tests` — utility seed scripts
- `/memory` — project memory artifacts
- `/test_reports` — generated test/run artifacts

## Backend module map

- `server.py` — API routes, app wiring, Mongo setup, CORS
- `models.py` — Pydantic request/response schemas
- `auth_utils.py` — password hashing, JWT creation/validation, current-user dependency
- `astrology_engine.py` — ephemeris calculations, houses/aspects/transits, location search
- `interpretation_engine.py` — reading and daily text generation by tier
- `payments.py` — Stripe checkout/session sync/webhook processing
- `ai_astrologer.py` — AI eligibility, context-building, session serialization, LLM chat calls
- `platform_content.py` / `academy_content.py` — content catalogs and tier metadata

## Frontend module map

- `src/App.js` — route definitions and route protection
- `src/lib/api.js` — axios client and auth token storage
- `src/context/AuthContext.jsx` — auth lifecycle and session state
- `src/context/AstrologerChatContext.jsx` — AI chat session/history state
- `src/pages/*` — route-level page experiences
- `src/components/common/*` — feature-level reusable modules
- `src/components/layout/AppShell.jsx` — global nav/layout shell

## Route map

Public:

- `/`
- `/auth`

Protected:

- `/onboarding`
- `/dashboard`
- `/readings/:tier`
- `/daily`
- `/astrologer`
- `/academy`
- `/account`

## Related pages

- [Architecture Overview](./architecture-overview.md)
- [Testing and Quality Checks](./testing-and-quality.md)
- [Backend API Reference](../reference/api-reference.md)
