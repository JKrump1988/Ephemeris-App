# User Workflows

This page describes the primary user journey through authentication, onboarding, dashboard use, and tier progression.

**Who this page is for:** End users, support, and product stakeholders.

## Main journey

1. User opens landing page (`/`)
2. User creates an account or signs in (`/auth`)
3. User enters birth details and location (`/onboarding`)
4. User accesses dashboard (`/dashboard`)
5. User opens readings, daily insights, academy, account, or AI Astrologer

## Authentication workflow

- Sign up requires name, email, and password
- Sign in requires email and password
- JWT token is stored in browser local storage
- Protected routes redirect unauthenticated users to `/auth`

## Onboarding workflow

- User provides birth date, optional birth time, and location search query
- Backend location search returns location + timezone options
- Saving chart calls `/api/chart`
- If birth time is unknown, app uses `12:00 UT` approximation

## Dashboard workflow

Dashboard loads:

- Current chart (`/api/chart/current`)
- Platform overview (`/api/platform/overview`)
- Billing tiers (`/api/billing/tiers`)
- Academy catalog (`/api/academy/catalog`)

Dashboard provides:

- Quick navigation to tiers and daily insights
- Tier unlock actions (Stripe checkout)
- Inline AI Astrologer panel
- Academy preview cards

## Billing unlock workflow

- User starts checkout from dashboard or reading page
- Backend creates Stripe session via `/api/billing/checkout/session`
- User returns to dashboard with checkout query params
- Frontend polls `/api/billing/checkout/status/{session_id}`
- User tier is refreshed after paid confirmation

## Related pages

- [Readings and Daily Insights](./readings-and-daily.md)
- [AI Astrologer Guide](./ai-astrologer.md)
- [Account and Chart Management](./account-and-chart-management.md)
