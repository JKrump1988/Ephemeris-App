# Local Development Setup

This page describes the local setup flow for Ephemeral based on repository code and scripts.

**Who this page is for:** Developers and maintainers.

## Prerequisites

- Python 3.11+ (backend FastAPI stack)
- Node.js + npm (frontend CRA/CRACO stack)
- MongoDB instance
- Stripe API key (required for checkout routes)
- EMERGENT LLM key (required for AI Astrologer responses)

## Repository structure

- Backend: `/backend`
- Frontend: `/frontend`
- Tests: `/backend/tests`

## Install dependencies

### Backend

```bash
cd /home/runner/work/Ephemeris-App/Ephemeris-App/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd /home/runner/work/Ephemeris-App/Ephemeris-App/frontend
npm install
```

## Configure environment variables

Set backend and frontend environment variables before starting services.

- Backend variables: see [Environment Variable Reference](./environment-reference.md)
- Frontend variable: `REACT_APP_BACKEND_URL`

## Run locally

### Start backend

```bash
cd /home/runner/work/Ephemeris-App/Ephemeris-App/backend
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### Start frontend

```bash
cd /home/runner/work/Ephemeris-App/Ephemeris-App/frontend
npm start
```

## Common startup issues

- Missing Python modules: install backend requirements in an active virtual environment.
- `craco: not found`: run `npm install` in `/frontend`.
- Mongo connection errors: confirm `MONGO_URL` and `DB_NAME`.
- Auth token errors: verify `JWT_SECRET` and `TOKEN_EXPIRE_MINUTES`.

## Related pages

- [Environment Variable Reference](./environment-reference.md)
- [Testing and Quality Checks](../developer/testing-and-quality.md)
- [Troubleshooting and FAQ](../operations/troubleshooting-faq.md)

## Needs Verification

- This repository does not include checked-in `.env.example` files. Standard local defaults (ports, Mongo URI, and frontend URL) should be confirmed by maintainers.
