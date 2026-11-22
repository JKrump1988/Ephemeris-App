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
- A known birth time is required before regeneration
- The time field accepts 24-hour `HH:MM` or `HH:MM:SS`, with up to six fractional-second digits after seconds
- The editor preserves the complete time when only the date or location changes
- Regeneration recomputes chart and updates all dependent reading layers

## Previously saved approximate charts

An existing chart may have been calculated with an approximate time under an older version.
Opening the editor does not change that saved chart. If the saved time is missing or the
chart is marked approximate, the editor leaves the time field empty and requires a known
birth time before regeneration. It does not treat an old substituted time as exact.

New calculations reject unknown or missing birth times and do not substitute noon.
A user-provided known time of `12:00` or `00:00` is valid. A rejected update leaves the
saved chart unchanged.

Repeated local times still require an explicit UTC offset in the API. Offset selection
in the input UI remains a release gate; see the
[Profile calculation contract](../developer/profile-calculation-contract.md).

## Related pages

- [User Workflows](./workflows.md)
- [Readings and Daily Insights](./readings-and-daily.md)
- [Backend API Reference](../reference/api-reference.md)
