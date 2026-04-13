# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0.1] - 2026-04-13

### Fixed
- The session API primary URL now returns a small status response instead of Fastify's default route-not-found JSON, so Render's service URL is safe to open directly while `/health` remains the deploy check.

## [0.2.0.0] - 2026-04-13

### Added
- DMs can now request, approve, reject, and apply approval-backed copilot intents from the live session without leaving the campaign desk.
- Campaign HQ now keeps a short recently resolved approval stack, so applied AI decisions remain visible during between-session prep.
- The session service now executes approved world-tick intents through the authoritative room store, updating the world clock, inbox fallout, memory pipeline, and websocket clients together.

### Changed
- Demo campaign bootstrapping now lives in the session app instead of the shared domain package, keeping domain exports focused on contracts, reducers, policies, and memory assembly.
- Shared web/session contracts now own copilot and voice response shapes, reducing drift between the frontend client and the session service.
- The monorepo dev scripts now build or wait for the shared domain package before starting session or web services, avoiding stale workspace artifacts during local development.
- Project docs now capture the Render deploy workflow, skill routing, local commands, and release history.

### Fixed
- Campaign-scoped session routes now return handled `400` responses for unknown campaigns instead of leaking `500` errors.
- Copilot suggestions are removed from the active rail once they enter the approval trail, so stale approved suggestions cannot be queued again.
- Approval request commands now reject unsupported AI intent types before they can enter the queue.
- Playwright now runs against the shared in-memory demo campaign with one worker, avoiding cross-test state races.
