# Project Game

Building an AI-native D&D VTT experience.

Project Game is an AI-native 5e-compatible virtual tabletop built around a staged architecture:

- `apps/web` hosts the Next.js client shell, campaign surfaces, and copilot UI.
- `apps/session` owns authoritative room state, command processing, the ledger, and async worker pipelines.
- `packages/domain` centralizes contracts, reducers, validators, policy rules, and memory assembly.

## Current implementation

This repository now contains the Phase 1 foundation:

- workspace scaffolding with `pnpm`
- shared domain contracts and reducers
- an authoritative session service with in-memory state, ledger, approvals, and async outbox processing
- a Next.js campaign shell with tabletop, copilot, voice, memory, and degraded-mode surfaces
- tests for command handling, memory assembly, and session service flows
- Docker and CI scaffolding for web plus session deployables

The original browser prototype remains in the repo as reference material while the rewrite is brought up.

## Getting started

1. Copy `.env.example` to `.env`
2. Run `corepack prepare pnpm@10.0.0 --activate`
3. Run `pnpm install`
4. Run `pnpm dev`

The web app runs at `http://localhost:3000` and the session service runs at `http://localhost:4000`.
