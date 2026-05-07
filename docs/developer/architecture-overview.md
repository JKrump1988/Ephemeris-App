# Architecture Overview

This page summarizes the verified runtime architecture for Ephemeral.

**Who this page is for:** Developers, architects, maintainers.

## System architecture

- Frontend: React (Create React App + CRACO) in `/frontend`
- Backend: FastAPI service in `/backend/server.py`
- Database: MongoDB via Motor (async)
- External services: OpenStreetMap Nominatim, Stripe Checkout, LLM API via emergentintegrations

## High-level diagram

```mermaid
flowchart LR
  U[User Browser] --> F[React Frontend]
  F -->|Bearer API calls| B[FastAPI Backend /api]
  B --> M[(MongoDB)]
  B --> N[OpenStreetMap Nominatim]
  B --> S[Stripe Checkout]
  S -->|webhook| B
  B --> L[LLM Provider via emergentintegrations]
```

## Core request/data flow

```mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant Backend
  participant Mongo

  User->>Frontend: Auth + onboarding input
  Frontend->>Backend: POST /api/auth/register|login
  Backend->>Mongo: store/read user
  Frontend->>Backend: POST /api/chart
  Backend->>Backend: Swiss ephemeris chart generation
  Backend->>Mongo: upsert chart + has_chart
  Frontend->>Backend: GET /api/readings/{tier}, /api/daily
  Backend->>Mongo: read chart/user tier
  Backend-->>Frontend: tiered reading/daily payload
```

## AI Astrologer flow

```mermaid
sequenceDiagram
  participant Frontend
  participant Backend
  participant Mongo
  participant LLM

  Frontend->>Backend: POST /api/ai-astrologer/message
  Backend->>Mongo: load user + chart + session
  Backend->>LLM: prompt with chart/session context
  LLM-->>Backend: assistant reply
  Backend->>Mongo: persist updated session
  Backend-->>Frontend: messages + reply
```

## Related pages

- [Codebase Structure](./codebase-structure.md)
- [Backend API Reference](../reference/api-reference.md)
- [Runtime and Operations](../operations/runtime-operations.md)
