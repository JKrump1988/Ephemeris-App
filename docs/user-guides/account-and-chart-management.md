# Account and Chart Management

This page explains account profile display and chart update/regeneration behavior.

**Who this page is for:** End users, support, and QA.

## Account page overview

`/account` shows:

- user identity details (name, email)
- current subscription tier
- saved chart metadata (birth date/time/location)
- tier access map
- platform future-module architecture snippets

## Editing birth details

`BirthChartEditor` on account page supports chart overwrite via `/api/chart/current`.

- User can change date/time/location
- User can mark birth time unknown
- Regeneration recomputes chart and updates all dependent reading layers

## Approximate-time behavior

If birth time is unknown:

- Backend uses `12:00 UT`
- Chart response flags approximation
- Notes warn that houses/Ascendant are approximate

## Related pages

- [User Workflows](./workflows.md)
- [Readings and Daily Insights](./readings-and-daily.md)
- [Backend API Reference](../reference/api-reference.md)
