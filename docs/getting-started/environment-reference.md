# Environment Variable Reference

This page lists environment variables used directly in the current codebase.

**Who this page is for:** Developers, operators, and maintainers.

## Backend environment variables

| Variable | Required | Used in | Purpose |
|---|---|---|---|
| `MONGO_URL` | Yes | `backend/server.py` | MongoDB connection URI |
| `DB_NAME` | Yes | `backend/server.py` | MongoDB database name |
| `JWT_SECRET` | Yes | `backend/auth_utils.py` | JWT signing key |
| `TOKEN_EXPIRE_MINUTES` | Yes | `backend/auth_utils.py`, `backend/server.py` | Access token expiry window |
| `STRIPE_API_KEY` | Yes (billing) | `backend/payments.py` | Stripe checkout/webhook client |
| `EMERGENT_LLM_KEY` | Yes (AI chat) | `backend/ai_astrologer.py` | LLM API key for AI Astrologer |
| `CORS_ORIGINS` | Optional | `backend/server.py` | Allowed origins list (comma-separated) |

## Frontend environment variables

| Variable | Required | Used in | Purpose |
|---|---|---|---|
| `REACT_APP_BACKEND_URL` | Yes | `frontend/src/lib/api.js` | Backend base URL for API client |
| `ENABLE_HEALTH_CHECK` | Optional | `frontend/craco.config.js` | Enables dev health-check plugin/endpoints |

## Security guidance

- Treat all keys and secrets as sensitive.
- Never commit real values into source control.
- Use environment-specific secret management in deployed environments.

## Related pages

- [Local Development Setup](./local-development.md)
- [Runtime and Operations](../operations/runtime-operations.md)
- [Backend API Reference](../reference/api-reference.md)

## Needs Verification

- No repository-managed `.env.example` files were found; maintainers should provide canonical example files for onboarding consistency.
