## Design System
Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, layout behavior, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that does not match `DESIGN.md`.

## Project Commands
- Dev: `corepack pnpm dev`
- Standalone session dev: `corepack pnpm dev:session`
- Standalone web dev: `corepack pnpm dev:web`
- Build: `corepack pnpm build`
- Typecheck: `corepack pnpm typecheck`
- Test: `corepack pnpm test`
- E2E: `corepack pnpm test:e2e`
- Pre-merge verify: `corepack pnpm verify`

## Deploy Configuration (configured by /setup-deploy)
- Platform: Render
- Production URL: https://project-game-qg4r.onrender.com
- Deploy workflow: auto-deploy on push to main
- Deploy status command: HTTP health check
- Merge method: squash
- Project type: API
- Post-deploy health check: https://project-game-qg4r.onrender.com/health

### Custom deploy hooks
- Pre-merge: corepack pnpm verify
- Deploy trigger: automatic on push to main
- Deploy status: poll https://project-game-qg4r.onrender.com/health
- Health check: https://project-game-qg4r.onrender.com/health

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming -> invoke office-hours
- Bugs, errors, "why is this broken", 500 errors -> invoke investigate
- Ship, deploy, push, create PR -> invoke ship
- QA, test the site, find bugs -> invoke qa
- Code review, check my diff -> invoke review
- Update docs after shipping -> invoke document-release
- Weekly retro -> invoke retro
- Design system, brand -> invoke design-consultation
- Visual audit, design polish -> invoke design-review
- Architecture review -> invoke plan-eng-review
