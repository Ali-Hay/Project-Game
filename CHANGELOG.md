# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0.1] - 2026-04-01

### Changed
- The session service now boots cleanly in Render and other compiled environments because `@project-game/domain` resolves its built `dist` entrypoints in production.

### For contributors
- Added a domain watch loop and `corepack pnpm verify`, so the monorepo has one reliable local dev and pre-merge gate.
- Documented project commands, deploy hooks, and skill routing guidance in `CLAUDE.md`, so shipping and investigation workflows are easy to find.
- Root dev scripts now build or wait for the shared domain package before starting the session or web apps, which avoids stale or missing workspace artifacts during local development.
