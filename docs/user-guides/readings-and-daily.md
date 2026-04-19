# Readings and Daily Insights

This page explains how Ephemeral presents tiered readings and daily transit insight content.

**Who this page is for:** End users, support, and product documentation teams.

## Tiered reading behavior

Reading routes use `/readings/:tier` and call `/api/readings/{tier}`.

- If tier is accessible: full section list is returned
- If tier is locked: preview sections are returned with locked-topic list
- Tier cards and reading page can start Stripe checkout for unlocks

## Tier content scope

- **Snapshot**: Big Three synthesis and personality baseline
- **Profile**: Adds Mercury/Venus/Mars, balance, and personal aspects
- **Blueprint**: Adds houses, chart ruler, node, Saturn, and vocation framing
- **Master**: Adds transit climate, influence windows, and timing-cycle framing

## Daily insights behavior

Daily route (`/daily`) calls `/api/daily`.

Response includes:

- `cosmic_weather`
- `personal_transit_note`
- `reflection_prompt`
- `highlights`
- contextual note from chart metadata

Daily content is chart-aware and depends on the user having a saved chart.

## Error/redirect behavior

If no chart exists, reading and daily pages redirect to onboarding.

## Related pages

- [User Workflows](./workflows.md)
- [Backend API Reference](../reference/api-reference.md)
- [Core Concepts](../overview/core-concepts.md)
