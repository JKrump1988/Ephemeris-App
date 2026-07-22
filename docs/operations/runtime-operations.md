# Runtime and Operations

This page captures operational behavior supported by the current repository.

**Who this page is for:** Maintainers, operators, and support engineers.

## Runtime components

- FastAPI backend service
- MongoDB database
- React frontend service
- Stripe integration endpoints
- LLM integration for AI Astrologer

## Configuration and secrets

Use environment variables for all secrets and runtime settings.

See [Environment Variable Reference](../getting-started/environment-reference.md).

## CORS behavior

CORS origins are controlled by `CORS_ORIGINS` in backend environment.

## Data persistence collections (inferred)

- `users`
- `charts`
- `payment_transactions`
- `ai_astrologer_sessions`

## Logging

Backend configures Python logging in `server.py` with INFO level.

## Security considerations

- JWT bearer token authentication for protected routes
- Password hashing via bcrypt/passlib
- AI responses constrained by safety instructions in system message
- Stripe ownership checks in checkout status sync

## Needs Verification

- No deployment manifests (Dockerfile, compose, k8s, Terraform, CI workflows) are present in this repository clone. Production deployment topology and runbooks should be documented once canonical infrastructure definitions are available.

## Related pages

- [Environment Variable Reference](../getting-started/environment-reference.md)
- [Backend API Reference](../reference/api-reference.md)
- [Troubleshooting and FAQ](./troubleshooting-faq.md)
