# Troubleshooting and FAQ

This page provides practical troubleshooting for common runtime and developer issues.

**Who this page is for:** Users, support, developers, and maintainers.

## Troubleshooting

### “Could not validate credentials” errors

- Ensure `Authorization: Bearer <token>` is set.
- Re-authenticate via `/api/auth/login` if token expired.
- Verify backend `JWT_SECRET` and `TOKEN_EXPIRE_MINUTES`.

### “No saved chart found for this account”

- User has not completed onboarding.
- Create chart via `/api/chart` from onboarding flow.

### Location search returns no entries

- Confirm network access to OpenStreetMap Nominatim.
- Try broader query terms.

### Checkout status not unlocking tier

- Verify checkout belongs to same authenticated user.
- Confirm Stripe status is `paid`.
- Retry `/api/billing/checkout/status/{session_id}`.

### AI Astrologer shows locked message

- Feature requires `blueprint` or `master` tier.
- Confirm user tier in `/api/auth/me`.

### Frontend command fails with `craco: not found`

- Run `npm install` in `/frontend` before `npm start/build/test`.

### Backend tests fail with missing `pytest`

- Install backend dependencies from `backend/requirements.txt`.

## FAQ

### Is astrology deterministic in this product?

No. The app and AI prompt framing position astrology as reflective guidance, not deterministic fate.

### Do users need birth time?

No. If unknown, backend uses `12:00 UT` and marks house/Ascendant precision as approximate.

### Does AI Astrologer recalculate the chart each message?

No. It uses saved chart data and persisted session context.

### Are Academy courses fully active?

Current implementation is a catalog/content shell and UI experience, not a full LMS integration.

## Related pages

- [User Workflows](../user-guides/workflows.md)
- [Runtime and Operations](./runtime-operations.md)
- [Testing and Quality Checks](../developer/testing-and-quality.md)
