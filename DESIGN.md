# Design System — Project Game

## Product Context
- **What this is:** Project Game is an AI-native 5e-compatible virtual tabletop and campaign operating system. It helps online home groups run live sessions on a map-first tabletop while the AI handles recap, memory, world pressure, and approval-aware copilot work in the background.
- **Who it's for:** Human DMs running weekly online campaigns for 3-6 players, with a secondary audience of solo or duet players using autonomous AI DM scenes between sessions.
- **Space/industry:** Browser-based VTTs and adjacent campaign tools. Useful reference points are Roll20, Owlbear Rodeo, D&D Beyond Maps, and AI workspaces with sidecar agents.
- **Project type:** Web app with a companion-grade mobile view, not a marketing site pretending to be an app.

## Aesthetic Direction
- **Direction:** Candlelit War Desk
- **Decoration level:** Intentional
- **Mood:** The product should feel like a DM's field kit laid open across a slate command table. Literate, calm, tactical, atmospheric. Not cosplay, not enterprise SaaS, not neon sci-fi.
- **Reference sites:** https://docs.owlbear.rodeo/docs/getting-started/, https://help.roll20.net/hc/en-us/articles/360039674973-The-Tabletop, https://www.dndbeyond.com/games, https://www.notion.com/product/ai

## Safe Choices And Deliberate Risks

### Safe Choices
- **Map-first layout:** The live session experience centers the tabletop because that is still the job players feel most directly.
- **Productivity-style rails:** Transcript, approvals, recap, and world pressure live in clear side rails instead of floating fantasy widgets.
- **Status-forward UX:** Diagnostics and degraded-mode surfaces stay visible and plainspoken so the table feels dependable.

### Deliberate Risks
- **Literary serif headlines instead of fantasy-logo typography:** This keeps the game feeling serious and worldful without falling into tavern-sign parody.
- **Warm brass plus slate instead of purple gradients or bright token-game colors:** The product gets a recognizable face and feels more like a real campaign desk than a generic dashboard.
- **Transcript as a first-class rail, not hidden chat:** The product's AI-native value becomes visible in the interface instead of buried behind one button.

## Product Shells

### 1. Live Session
- Primary goal: Run a scene with zero hesitation.
- Desktop layout: 12-column grid.
- Column split: transcript rail `2`, battlemap `7`, copilot and approvals rail `3`.
- Secondary surface: bottom combat drawer for initiative, conditions, and quick rolls.
- Keep on screen: scene name, sync status, world day, approval count, current encounter.
- Never place inbox, rumors, or campaign administration at equal visual weight with the battlemap during live play.

### 2. Campaign HQ
- Primary goal: Prep, review consequences, handle downtime, and understand the living world.
- Desktop layout: left nav `2`, main feed `6`, world pressure rail `4`.
- Core surfaces: inbox, faction pressure, active fronts, NPC relationships, unresolved threads, prep prompts, recap archive.
- This is where the between-session game lives.

### 3. Player Companion
- Primary goal: Stay present from a phone without trying to DM from a phone.
- Mobile layout: single-column stack with sticky bottom navigation.
- Core surfaces: character snapshot, dice, chat and recap, handouts, current objective.
- Explicitly out of scope for v1: full GM map editing and complex prep workflows on small screens.

## Typography
- **Display/Hero:** `Fraunces` 600/700
  - Use for campaign titles, scene headers, major section heads, and ceremonial moments.
  - Why: It feels literary and sharp, not theme-park fantasy.
- **Body:** `Plus Jakarta Sans` 400/500/600/700
  - Use for paragraphs, controls, navigation, and general UI copy.
  - Why: It stays clean and readable in dense app layouts without looking sterile.
- **UI/Labels:** `Plus Jakarta Sans` 600
  - Use for buttons, tabs, chips, and compact metadata labels.
- **Data/Tables:** `IBM Plex Mono` 500 with tabular numerals
  - Use for initiative counts, HP deltas, dice totals, timestamps, coordinates, and diagnostics.
  - Why: Mechanical information should feel exact and glanceable.
- **Code:** `IBM Plex Mono`
- **Loading strategy:** `next/font/google` in the app. Preview pages may use Google Fonts links.

### Type Scale
- `display-2`: 72px / 0.92 / Fraunces 700
- `display-1`: 56px / 0.95 / Fraunces 700
- `h1`: 40px / 1.0 / Fraunces 600
- `h2`: 30px / 1.08 / Fraunces 600
- `h3`: 22px / 1.15 / Fraunces 600
- `body-lg`: 18px / 1.6 / Plus Jakarta Sans 500
- `body`: 16px / 1.6 / Plus Jakarta Sans 400
- `body-sm`: 14px / 1.55 / Plus Jakarta Sans 500
- `meta`: 12px / 1.4 / Plus Jakarta Sans 600
- `mono-sm`: 12px / 1.45 / IBM Plex Mono 500

## Color
- **Approach:** Balanced and restrained. One precious accent, one cool support color, strong neutrals.
- **Primary:** `#C7A45D` Brass
  - Use for key actions, current turn, focus strokes, and navigational emphasis.
- **Secondary:** `#5F8198` Storm Blue
  - Use for AI surfaces, informational emphasis, selected utility tools, and transcript activity.
- **Neutrals:**
  - `#F5EEDF` Vellum
  - `#E3D7C0` Bone
  - `#B8AA90` Ash
  - `#657181` Slate Mist
  - `#28313D` Tactical Slate
  - `#171C23` Inkstone
  - `#0B0E13` Obsidian
- **Semantic:**
  - success `#6F8E77`
  - warning `#D39A4A`
  - error `#C65A55`
  - info `#5F8BA8`
- **Dark mode strategy:** Dark mode is the default operating mode. Use Obsidian and Inkstone for structure, not pure black. Reduce accent saturation slightly on large fills and keep brass for intent, not decoration.
- **Light mode strategy:** Light mode becomes a vellum desk, not a washed-out inversion. Surfaces shift to Bone and Vellum, borders darken, and brass moves slightly earthier for contrast.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable-compact
- **Scale:** `2xs 4`, `xs 8`, `sm 12`, `md 16`, `lg 24`, `xl 32`, `2xl 48`, `3xl 64`
- **Rule:** Live session surfaces should feel tighter than Campaign HQ. The table is operational. HQ can breathe more.

## Layout
- **Approach:** Hybrid
- **Grid by breakpoint:**
  - mobile `4` columns from `375px`
  - tablet `8` columns from `768px`
  - desktop `12` columns from `1280px`
  - wide desktop `12` columns with expanded map center from `1440px`
- **Max content width:**
  - live session shell `1680px`
  - HQ and landing shells `1360px`
- **Surface hierarchy:**
  - `Desk`: full-page shell
  - `Rail`: persistent side context
  - `Slate`: primary work surface
  - `Drawer`: secondary tactical detail
  - `Strip`: compact status or encounter summary
- **Border radius:**
  - `sm 6px`
  - `md 12px`
  - `lg 18px`
  - `pill 999px`
- **Rule:** Pills are for status chips only. Do not make every card and input look rounded and toy-like.

## Motion
- **Approach:** Intentional
- **Easing:**
  - enter `cubic-bezier(0.2, 0.8, 0.2, 1)`
  - exit `cubic-bezier(0.4, 0, 1, 1)`
  - move `cubic-bezier(0.16, 1, 0.3, 1)`
- **Duration:**
  - micro `80ms`
  - short `180ms`
  - medium `280ms`
  - long `420ms`
- **Allowed motion:**
  - rail and drawer reveals
  - transcript line fade-in
  - token selection glow
  - recap refresh shimmer
- **Avoid:**
  - bounce
  - elastic drag
  - idle looping decoration
  - flashy gradient motion

## Component Vocabulary

### Navigation And Shell
- `Campaign Header`: campaign title, scene, sync state, world day, approval count.
- `Mode Tabs`: Live Session, Campaign HQ, Player Companion.
- `Pressure Strip`: active front pressure, unresolved approvals, degraded service state.

### Tabletop
- `Battle Slate`: central map surface with grid, fog, tokens, rulers, and area overlays.
- `Token Roster`: keyboard- and mobile-friendly mirror of map state.
- `Combat Drawer`: initiative, conditions, turn order, damage summaries, quick actions.

### AI And Memory
- `Copilot Rail`: recap, recent transcript turns, AI suggestions, one-step helper actions.
- `Approval Card`: title, consequence summary, source, approve/reject controls.
- `Memory Fact List`: terse, structured, mono-assisted fact rows, not chat bubbles.

### Living World
- `Inbox Card`: event headline, source, time, consequence.
- `Front Card`: progress meter, stakes, latest shift.
- `Quest Thread`: clue, owner, urgency, last touched.

## Responsive Rules
- On phones, collapse the transcript rail into a tabbed bottom sheet.
- On tablets, keep the map dominant and move AI plus approvals below the map.
- Preserve a roster mirror of map state on all narrow screens so tokens remain operable without precision dragging.
- Minimum touch target: `44px`.
- Horizontal scrolling is acceptable inside tactical tables, never for the main app shell.

## Accessibility
- Body text contrast must meet WCAG AA in both dark and light modes.
- Every focusable control gets a visible focus ring using Brass at `2px` with `2px` offset.
- Token state must be available in text form through the roster mirror.
- Color cannot be the only carrier of combat or approval state.
- Reduced motion mode removes non-essential fades and drawer animation.
- Transcript, recap, and system banners should be screen-reader reachable as landmark regions.

## Copy Tone
- Voice: direct, literate, operational.
- Prefer verbs over slogans: `Advance world tick`, `Approve canon change`, `Reconnect transcript`.
- Avoid over-fantasy chrome in product UI. Let the campaign content carry the lore.
- Diagnostic and degraded states should be plainspoken, not cute.

## Anti-Patterns
- No purple or violet default accenting.
- No generic frosted-glass SaaS cards everywhere.
- No centered-everything landing-page layouts inside product surfaces.
- No fantasy tavern-sign typography.
- No gradient-first CTA language or decorative icon circles.

## Implementation Notes
- The current app already has the right seed with a dark slate palette and serif-plus-sans structure. Evolve that; do not swing to a totally unrelated bright system.
- Replace decorative hero-first product layout habits with shell-first application layout.
- The first major UI refactor should separate the current single campaign shell into `Live Session`, `Campaign HQ`, and `Player Companion` routes or modes.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-30 | Adopted Candlelit War Desk as the core visual direction | Gives the product a distinct point of view without drifting into parody |
| 2026-03-30 | Chose Fraunces + Plus Jakarta Sans + IBM Plex Mono | Balances atmosphere, readability, and tactical clarity |
| 2026-03-30 | Made dark mode the default operating environment | Live sessions read better as a focused war-desk than as a bright admin app |
| 2026-03-30 | Split the product into Live Session, Campaign HQ, and Player Companion shells | Prevents the live table from becoming a dashboard pileup |
| 2026-03-30 | Treated transcript and approvals as first-class rails | The AI-native value should be visible and operable during play |
