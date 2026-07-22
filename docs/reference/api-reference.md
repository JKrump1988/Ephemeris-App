# Backend API Reference

This page documents the FastAPI routes implemented in `backend/server.py`.

**Who this page is for:** Frontend developers, backend developers, QA, and integrators.

Base path: `/api`

## Authentication

### `POST /auth/register`
Creates a new user and returns bearer token + user profile.

### `POST /auth/login`
Authenticates user and returns bearer token + user profile.

### `GET /auth/me`
Returns current authenticated user.

## Chart and location

### `GET /locations/search?q=...`
Returns location candidates with coordinates and timezone.

### `POST /chart`
Creates or replaces current user chart from birth payload.

### `PUT /chart/current`
Alias update endpoint for current chart payload.

### `GET /chart/current`
Returns current saved chart with tier access summary.

## Readings and daily

### `GET /readings/{tier}`
Returns reading payload for `snapshot|profile|blueprint|master`.

### `GET /daily`
Returns daily transit-oriented insight payload.

## Platform content

### `GET /platform/overview`
Returns architecture/feature map narrative arrays.

### `GET /academy/catalog`
Returns academy catalog/course/module/lesson content.

## Billing

### `GET /billing/tiers`
Returns current tier and purchasable tier catalog.

### `POST /billing/checkout/session`
Creates Stripe checkout session for target tier.

### `GET /billing/checkout/status/{session_id}`
Synchronizes checkout state and applies entitlement on paid sessions.

### `POST /webhook/stripe`
Accepts Stripe webhook payload processing.

## AI Astrologer

### `GET /ai-astrologer/session/{session_id}`
Gets or creates a session for current user (Blueprint/Master only).

### `GET /ai-astrologer/sessions`
Lists user’s prior non-empty sessions (Blueprint/Master only).

### `POST /ai-astrologer/message`
Appends a user message and returns assistant reply + full session messages.

## Auth requirement summary

Public:

- `GET /`
- `GET /platform/overview`
- `POST /webhook/stripe`

All other routes require bearer authentication.

## Related pages

- [Environment Variable Reference](../getting-started/environment-reference.md)
- [Architecture Overview](../developer/architecture-overview.md)
- [User Workflows](../user-guides/workflows.md)
