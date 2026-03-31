# QA Report — Project Game — 2026-03-31

## Summary

- Tier: Standard
- Scope: Live Session, Campaign HQ, Player Companion
- Browser coverage: Desktop and iPhone 13 viewport
- Console errors: 0
- Automated regression suite: `3/3` Playwright tests passed after fix
- Health score: 92 -> 100
- Ship readiness: Ready

## Issue Log

### ISSUE-001

- Severity: Medium
- Title: Mobile live transcript sheet was still behaving like normal page content instead of a true bottom sheet
- Status: Verified fixed
- Files changed: `apps/web/app/globals.css`
- User impact: On phones, the live session could feel like a long stacked dashboard instead of a map-first tabletop with a persistent bottom sheet for transcript and pressure.

#### Repro

1. Open `/campaigns/campaign_demo` on a phone-sized viewport.
2. Scroll and inspect the live session layout.
3. Notice that the transcript rail participates in the page flow instead of anchoring as a true bottom sheet.

#### Fix

- Promoted the mobile transcript rail to a fixed bottom sheet.
- Added mobile bottom padding to the live shell so the overlay does not hide the underlying content.

#### Evidence

- Before: `.gstack/qa-reports/project-game-2026-03-31/screenshots/issue-001-before.png`
- After: `.gstack/qa-reports/project-game-2026-03-31/screenshots/issue-001-after.png`

## Screenshots

- `.gstack/qa-reports/project-game-2026-03-31/screenshots/initial-live-desktop.png`
- `.gstack/qa-reports/project-game-2026-03-31/screenshots/hq-desktop.png`
- `.gstack/qa-reports/project-game-2026-03-31/screenshots/companion-desktop.png`
- `.gstack/qa-reports/project-game-2026-03-31/screenshots/live-mobile.png`
- `.gstack/qa-reports/project-game-2026-03-31/screenshots/live-mobile-pressure.png`
- `.gstack/qa-reports/project-game-2026-03-31/screenshots/companion-mobile.png`

## Verification

- Browser QA rerun completed with `0` remaining issues.
- `corepack pnpm test:e2e` passed after the fix.
