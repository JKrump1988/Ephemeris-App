# AI Astrologer Guide

This page documents current AI Astrologer behavior, access rules, and session handling.

**Who this page is for:** End users, support, and developers.

## Availability

AI Astrologer is available only for `blueprint` and `master` subscriptions.

- Non-eligible users see upgrade messaging
- Eligible users can chat on dashboard panel and dedicated `/astrologer` page

## Session model

- Conversations are stored per user in `ai_astrologer_sessions`
- Session history is listed via `/api/ai-astrologer/sessions`
- Specific sessions load via `/api/ai-astrologer/session/{session_id}`
- Messages send via `/api/ai-astrologer/message`

## Interaction behavior

- Uses saved natal chart context in system prompt
- Supports optional `focus_context` from interactive chart elements
- Persists messages, title, preview, and last focus title
- Provides suggested opening prompts for empty sessions

## Safety framing

Backend prompt explicitly instructs the assistant to:

- avoid deterministic fate language
- avoid medical, legal, and financial claims
- frame outputs as reflective guidance

## Related pages

- [User Workflows](./workflows.md)
- [Backend API Reference](../reference/api-reference.md)
- [Runtime and Operations](../operations/runtime-operations.md)
