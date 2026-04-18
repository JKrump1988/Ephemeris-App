# Core Concepts

This page defines key product and technical concepts used across Ephemeral documentation.

**Who this page is for:** End users, support, developers, and maintainers.

## Reading tiers

- **Snapshot**: Free baseline reading (Big Three, identity summary)
- **Profile**: Adds Mercury, Venus, Mars, balance, and aspects
- **Blueprint**: Adds houses, chart ruler, node, Saturn, and career framing
- **Master**: Adds current transit and timing-cycle interpretation

Tier logic is defined in `backend/platform_content.py` and `backend/interpretation_engine.py`.

## Chart model

A saved chart includes:

- Input context (birth date/time/location/timezone)
- Calculated placements (planets, nodes, Ascendant, Midheaven)
- Houses, aspects, element/modality balance
- House focus, chart ruler, career summary
- Transit layer

Core generation logic is in `backend/astrology_engine.py`.

## Access model

- New accounts start at `snapshot`
- Access checks are based on tier sequence: snapshot → profile → blueprint → master
- AI Astrologer is available only to blueprint/master

## Session concepts

- **Auth session**: JWT bearer token for API access
- **AI session**: Chat thread persisted in `ai_astrologer_sessions`
- **Checkout session**: Stripe checkout flow tracked via `payment_transactions`

## Glossary

- **Big Three**: Sun, Moon, Ascendant synthesis
- **Transit**: Current planetary position relationship to natal chart
- **Chart ruler**: Planet ruling Ascendant sign
- **Tier unlock**: Subscription-level entitlement update after successful payment

## Related pages

- [What is Ephemeral?](./what-is-ephemeral.md)
- [Readings and Daily Insights](../user-guides/readings-and-daily.md)
- [Backend API Reference](../reference/api-reference.md)
