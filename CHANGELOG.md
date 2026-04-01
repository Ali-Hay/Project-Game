# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0.1] - 2026-04-01

### Added
- A domain watch loop and a `corepack pnpm verify` pre-merge command so the monorepo has one reliable local dev and ship gate.
- Project commands, deploy hooks, and skill routing guidance in `CLAUDE.md` so shipping and investigation workflows are explicit.

### Changed
- `@project-game/domain` now resolves its built `dist` entrypoints in production so the session service boots cleanly in Render and other compiled environments.
- Root dev scripts now build or wait for the shared domain package before starting the session or web apps, which avoids stale or missing workspace artifacts during local development.
