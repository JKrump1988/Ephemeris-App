# What is Ephemeral?

Ephemeral is a web application that calculates a natal chart from birth data and delivers layered astrology interpretations across four tiers: Snapshot, Profile, Blueprint, and Master.

**Who this page is for:** New stakeholders, product readers, support, and contributors.

## Product summary

Ephemeral combines:

- A React frontend for account onboarding and reading experiences (`/frontend/src`)
- A FastAPI backend for authentication, chart generation, interpretation, billing, and AI chat (`/backend/server.py`)
- MongoDB persistence for users, charts, payment transactions, and AI sessions

## Primary capabilities

- Email/password authentication
- Birth location search and timezone resolution
- Ephemeris-based natal chart generation via Swiss Ephemeris (`pyswisseph`)
- Tiered reading generation from one saved chart
- Daily transit-based insight generation
- Stripe checkout for paid tier unlocks
- AI Astrologer chat for Blueprint/Master users
- Academy catalog placeholder content

## Target users (inferred from app flows)

- End users who want natal and transit-based astrology readings
- Paid users who unlock deeper tiers
- Blueprint/Master users using AI Astrologer chat
- Internal product/development teams maintaining the platform

## Related pages

- [Core Concepts](./core-concepts.md)
- [User Workflows](../user-guides/workflows.md)
- [Architecture Overview](../developer/architecture-overview.md)
