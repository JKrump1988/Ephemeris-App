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

- User provides birth date, a known birth time, and location search query
- Birth time starts empty and accepts 24-hour `HH:MM` or `HH:MM:SS`, with up to six fractional-second digits after seconds
- Backend location search returns location + timezone options
- Saving chart calls `/api/chart`
- Missing or invalid birth time is blocked before saving; this version does not offer unknown-time calculations or substitute noon
- Repeated local times still need API offset selection, which remains an input-UI release gate in the [Profile calculation contract](../developer/profile-calculation-contract.md)

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
