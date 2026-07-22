# Contribution Guide

This page describes contribution expectations that can be verified from the current repository structure.

**Who this page is for:** Contributors and maintainers.

## Contribution scope

Typical contribution areas:

- Backend API and business logic in `/backend`
- Frontend pages/components in `/frontend/src`
- Automated tests in `/backend/tests`
- Documentation in `/docs`

## Local workflow

1. Install backend/frontend dependencies.
2. Configure required environment variables.
3. Run backend and frontend locally.
4. Run available tests/build checks before opening PR.
5. Update docs for behavior changes.

## Documentation standards

- Keep docs source-grounded (code/config/tests)
- Avoid unverified claims
- Add cross-links to adjacent topics
- Add `Needs Verification` sections where certainty is incomplete

## Needs Verification

- Branch naming conventions, PR templates, release process, and CI policy are not discoverable from this repository snapshot and should be documented by maintainers if standardized.

## Related pages

- [Local Development Setup](../getting-started/local-development.md)
- [Testing and Quality Checks](../developer/testing-and-quality.md)
- [Ephemeral Documentation](../README.md)
