# Ephemeral PRD

## Original Problem Statement
Design a scalable astrology application called "Ephemeral" that generates astrology readings derived from actual ephemeris-based calculations. The platform must support modular feature expansion and progressive monetization tiers, and the architecture should be suitable for AI-assisted development and autonomous iteration.

Core concept: Ephemeral is a personalized astrology platform that calculates a user's natal chart using astronomical ephemeris data and generates layered interpretations that expand through progressive insight tiers.

Required modules from the brief:
- User Identity Module with birth date, birth location, and birth time input
- Ephemeris Calculation Engine for Sun, Moon, Ascendant, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Lunar Nodes, major aspects, and houses
- Interpretation Engine
- Reading Tier System: Snapshot, Profile, Blueprint, Master
- Daily Astrology System
- Monetization layer with progressive unlocks
- Future AI Astrologer module
- Future education module "Ephemeral Academy"
- Safety framework: insight not fate; avoid medical, legal, financial claims

## User Choices
- MVP scope: Core reading MVP first
- Include: chart input, ephemeris calculations, Snapshot/Profile/Blueprint/Master readings, daily insights
- Authentication: email/password
- AI astrologer: OpenAI GPT-5.2 later in architecture, not core MVP implementation yet
- Universal key: Emergent universal key later if needed
- Visual direction: editorial cosmic with bold typography

## Architecture Decisions
- Frontend: React app with routed pages for landing, auth, onboarding, dashboard, tier readings, daily insights, academy, and account
- Backend: FastAPI with modular files for auth, astrology engine, interpretation engine, models, and platform content
- Database: MongoDB for users and saved chart documents via Motor
- Auth: JWT bearer tokens with bcrypt hashing and email/password flows
- Astrology engine: Swiss ephemeris via pyswisseph using Moshier ephemeris flags, timezone-aware UTC conversion, house calculation, aspects, nodes, and transits
- Location handling: OpenStreetMap Nominatim search plus timezonefinder-derived timezone resolution
- Interpretation engine: deterministic, psychologically framed text generation from placements, aspects, houses, and transit data
- Monetization-ready UX: tier access map with free Snapshot, Stripe checkout entry points, progressive unlock logic, and payment status polling
- Future-ready structure: backend route exposing AI astrologer and academy architecture notes for later modules plus an Academy catalog shell with course/module/lesson data

## User Personas
1. Astrology-curious user seeking a refined first chart reading
2. Returning user who wants saved chart access and daily cosmic guidance
3. Premium-intent user comparing Snapshot vs deeper paid layers
4. Future power user interested in AI chart explanation and astrology education modules

## Core Requirements (Static)
- Use actual ephemeris-based calculations
- Support birth date, time, and location input
- If time is unknown, use 12:00 UT and disclose approximation for houses/ascendant
- Generate layered reading tiers from one chart foundation
- Provide daily transit-based insights
- Keep language psychologically meaningful and non-deterministic
- Maintain modular, scalable architecture
- Preserve safety framing and avoid prohibited claim types

## What's Implemented
### 2026-03-12
- Built full email/password authentication flow with register, login, current-user retrieval, JWT persistence, and protected frontend routes
- Implemented location search using Nominatim plus timezone resolution for chart intake
- Implemented natal chart calculation engine with Sun, Moon, Ascendant, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, North/South Nodes, houses, aspects, chart ruler, house emphasis, and current transits
- Implemented reading generation for Snapshot, Profile, Blueprint, and Master, including locked preview behavior for deeper tiers
- Implemented daily astrology endpoint and page with cosmic weather, personal transit note, and reflection prompt
- Built editorial cosmic frontend across landing, auth, onboarding, dashboard, reading pages, daily page, and account page
- Added platform overview architecture output for system architecture, feature map, data flow, reading logic, monetization flow, AI astrologer architecture, and Ephemeral Academy structure
- Added stronger API validation for chart date/time payloads after test review
- Completed self-testing plus automated backend/frontend validation; all tested flows passed

### 2026-03-13
- Added Stripe checkout integration for progressive premium tier unlocks so Profile, Blueprint, and Master can be purchased with server-defined pricing and saved payment transactions
- Implemented billing catalog, checkout session creation, checkout status sync, webhook handling, and entitlement upgrade logic that preserves the layered reading model
- Added a visual natal chart wheel on the dashboard showing zodiac ring, house cusps, aspect geometry, and major placement markers
- Added account-level chart editing so users can update birth details, overwrite the saved chart, and regenerate readings immediately
- Improved the dashboard with quick-access cards for Snapshot, Daily, Premium tiers, Academy, and stronger premium storytelling for locked layers
- Built the first Ephemeral Academy section with future-ready course catalog, module structure, and mixed video/text lesson placeholders
- Added regression coverage for billing, academy, and chart-update flows; backend and frontend validation passed

## Prioritized Backlog
### P0
- Add webhook hardening and stronger post-payment return UX polish for Stripe success states
- Add user-facing chart editing/regeneration history with versioning instead of overwrite-only behavior
- Add stronger backend error states and rate limiting around public location search

### P1
- Add richer chart visualizations beyond the current static wheel (interactive tooltips, aspect grid, deeper wheel controls)
- Add AI Astrologer chat using saved natal chart context and future OpenAI integration
- Add subscription-ready daily insight history and notification preferences
- Add better accessibility polish for keyboard-only navigation and reduced-motion preferences

### P2
- Build full Ephemeral Academy playback, progress tracking, and embedded lesson experience
- Add multiple saved charts / relationship or transit comparison charts
- Add analytics for tier conversion and reading engagement depth
- Add localization / multi-language astrology copy support

## Remaining Features by Priority
### P0 Remaining
- Stronger Stripe success/cancel return handling and payment ops observability
- Chart history/version management
- Better rate limiting and resilience around external geocoding/search dependencies

### P1 Remaining
- AI Astrologer chat layer
- More interactive chart visual components
- Daily history / notifications / retention features

### P2 Remaining
- Academy / LMS integration with playback and progress
- Multi-chart experiences
- Admin and analytics tooling

## Next Tasks List
- Polish Stripe success-state UX and strengthen payment lifecycle observability
- Expand the natal wheel into interactive chart exploration with aspect tooltips and sign/house detail overlays
- Introduce AI astrologer chat powered by saved chart context and safety-checked prompts
- Add chart history so users can compare revised birth data without losing the previous version
