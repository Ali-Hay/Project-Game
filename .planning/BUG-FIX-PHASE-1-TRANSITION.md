# Chronicle: Zero — Bug Fixes + Phase 1 Transition Prompt

**Status:** Phase 0 (Foundation) — BLOCKING ISSUES  
**Date:** March 5, 2026  
**Priority:** CRITICAL (must resolve to proceed to Phase 1)

---

## Executive Summary

Phase 0 completion includes three critical bugs introduced during UI refactor:
1. **Prose rendering over tactical grid** — Z-index/visibility issue preventing clean combat display
2. **Unlimited combat actions** — Action economy not enforced; player can move, attack, and use items without turn cost
3. **Missing action economy UI** — No visual feedback for remaining actions, turn order, or action points

These must be **fixed before Phase 1** (Metadata Infrastructure) can begin, as Phase 1 depends on a stable combat system to add prose metadata and emotion tagging.

---

## Architecture Context (from `copilot-instructions.md`)

### Dual-Model Flow
The game separates **deterministic authority** (LogicGate) from **generative narrative** (Weaver):
1. Player action → **LogicGate validates** and resolves (rolls, modifies state, returns raw result)
2. Raw result → **Weaver receives** deterministic data (e.g., `{hit: true, damage: 14, crit: false, targetName: 'Risen Guardian'}`)
3. Prose generation → **Weaver selects narrative**, substitutes values, applies tone
4. UI sync → Async prose display to `#prose-scroll` or `#combat-log`, state update

**Critical Rule:** Weaver never modifies world state. UI never overrides LogicGate.

### Combat State Machine
- Game state: `'exploration'` → `'combat'` → `'exploration'` or `'gameover'`
- CombatManager tracks `active`, `enemies[]`, `turnOrder[]`, `currentTurn` index
- Each turn: player action resolves → display result → call `nextTurn()` → process next entity
- Action scope: **one action per turn** (move, attack, use item, heal) — NOT multiple

---

## Bug #1: Prose Displaying Over Tactical Grid

### Root Cause
- **File:** `Game.js` lines 478-479, 740-741 (startCombat / endCombat)
- **Issue:** `#prose-panel` remains visible during combat; only `max-width` and `margin` adjusted
- `#prose-scroll` still renders text via `displaySingle(this.proseEl, ...)` calls
- Canvas (`z-index: 0`) → UI layer (`z-index: 1`) → but prose-panel sits above combat grid visually

### Expected Behavior
During combat:
- Combat prose goes to `#combat-log` (`z-index: 50` via sidebar) — **working ✓**
- `#prose-panel` should be **hidden** or collapsed to prevent overlap
- Canvas + grid only source of visual information (prose relegated to sidebar)

### Fix Requirements
1. Hide `#prose-panel` when entering combat (startCombat)
2. Show `#prose-panel` when exiting combat (endCombat)
3. Ensure combat-log scrolls independently; prose-panel doesn't steal focus or space
4. **Validate:** Combat prose appears in sidebar, main canvas unobstructed

---

## Bug #2: Unlimited Combat Actions (No Action Economy)

### Root Cause
- **File:** `Game.js` lines 563-604 (showCombatChoices → playerCombatMove / playerCombatAttack / playerCombatHeal)
- **Issue:** Player can move, then attack, then heal—all in SAME turn
  - `playerCombatMove()` displays message, calls `showCombatChoices()` again
  - No turn cost for movement; buttons regenerate
  - After movement, adjacency check passes, attack button appears
  - Player clicks attack → damage resolve → `nextTurn()` finally called ✓ (correct end)
  - But **before nextTurn**, player could have moved/attacked/healed in sequence

### Expected Behavior (from TTRPG session rules)
- **Each turn = ONE action** (move, Attack action, bonus action like Smite, or use item)
- Bonus actions (Smite) might be allowed alongside Attack action (D&D 5e rules)
- But standard: move + attack, OR move + use item, OR attack + heal
- **Current problem:** No enforcement—buttons stay clickable, turn doesn't advance until final action

### Fix Requirements
1. Track **player action taken this turn** flag (e.g., `this.combat.playerActionResolved`)
2. After ANY playable action (move, attack, heal), set flag + disable all buttons
3. Show clear feedback: `"You've taken your action. Enemy turn incoming..."`
4. Call `nextTurn()` after short delay, render enemy turn
5. **For multi-action support** (D&D bonus actions): implement later in Phase 1+ as optional rule variant
6. **Validate:** Player takes 1 move, 1 attack per turn; buttons gray out after action

---

## Bug #3: Missing Action Economy Tracker UI

### Root Cause
- **File:** `style.css` lines 66-73 (combat-sidebar styling)
- **Issue:** Sidebar exists with `#turn-tracker`, `#combat-log`, `#combat-actions`
  - `#turn-tracker` updates with round/turn name — **works ✓**
  - `#combat-log` receives prose — **works ✓**
  - `#combat-actions` receives buttons — **works ✓**
  - **Missing:** Action point indicator, remaining enemies list, HP summary

### Expected Behavior
Combat sidebar should display:
- **Top:** "ROUND X — Entity's Turn" (current)
- **Next:** Turn order list (initiative order, highlight current, show statuses)
- **Action area:** Available buttons + action economy indicator (e.g., "You have 1 action remaining")
- **Enemy tracker:** List of alive enemies with HP bars (mirrors grid visually)
- **Combat log:** Styled prose of events

### Fix Requirements
1. Add "Next in initiative order" section (show next 3-4 combatants)
2. Display simple **HP bars for all enemies** in sidebar (visual parity with grid)
3. Show **action points remaining** for player (1 action, 0 bonus actions in base rules)
4. When player's turn, highlight "Your Turn" in tracker
5. Enemy names + initiative order + status (alive/defeated) in a readable list
6. **Validate:** Player can glance at sidebar and understand who acts next + remaining options

---

## Fix Sequence (Recommended Order)

### Step 1: Fix Prose Panel Visibility (Bug #1)
**Duration:** 5 min
- In `startCombat()`: `document.getElementById('prose-panel').classList.add('hidden');`
- In `endCombat()`: `document.getElementById('prose-panel').classList.remove('hidden');`
- Add `.hidden { display: none !important; }` to style.css if not present
- Test: Enter combat, prose-panel disappears, combat-log appears in right sidebar, grid visible

### Step 2: Implement Action Economy Enforcement (Bug #2)
**Duration:** 15 min
- Add `this.combat.playerActionResolved = false;` init in CombatManager.startCombat()
- In `showCombatChoices()`:
  - If `this.combat.playerActionResolved === true`, show single message: "Waiting for enemy turn..."
  - Gray out / disable all buttons
  - Set auto-advance timer (500ms) → call `this.inputLocked = true;` + force `nextTurn()`
- After EACH action (playerCombatAttack, playerCombatHeal, playerCombatMove):
  - Do NOT auto-call `nextTurn()` yet
  - Set `this.combat.playerActionResolved = true;`  
  - Disable buttons
  - Let turn advance only via `nextTurn()` call (which is already called at end of attack/heal)
- Test: Player moves, buttons disable, waits, enemy acts, turn rotates

### Step 3: Enhance Combat Sidebar (Bug #3)
**Duration:** 20 min
- In HTML (index.html), expand `#combat-sidebar` internals:
  ```html
  <div id="turn-tracker">ROUND 1</div>
  <div id="turn-order">
    <div class="turn-entry current">Kael (You) — Ready</div>
    <div class="turn-entry">Skeleton Warrior — 12</div>
  </div>
  <div id="enemy-status">
    <div class="enemy-hp-item">
      <span class="enemy-name">Skeleton Warrior (1)</span>
      <div class="enemy-hp-bar">
        <div class="enemy-hp-fill"></div>
      </div>
    </div>
  </div>
  <div id="action-economy">
    <span>Actions Remaining: 1</span>
  </div>
  <div id="combat-log"></div>
  <div id="combat-actions"></div>
  ```
- In `processCombatTurn()` / `showCombatChoices()`:
  - Update `#action-economy` content with remaining actions
  - Update `#turn-order` to show next 3-4 combatants, highlight current
  - Update `#enemy-status` with live enemy HP bars (query `this.combat.enemies[]`)
- In CSS:
  - Style `.turn-entry.current` with highlight (e.g., `background: rgba(100,60,40,0.6); border-left: 3px solid #d4a56a;`)
  - Style `.enemy-hp-bar` similar to character sheet HP bar (red gradient)
- Test: Sidebar updates dynamically as turn progresses, enemy HP visible, turn order clear

---

## Validation Checklist

**Bug #1 (Prose Visibility)**
- ✅ Enter combat, prose-panel hidden (no text overlay on grid)
- ✅ Combat prose appears in right sidebar under combat-log
- ✅ Canvas grid unobstructed and fully clickable
- ✅ Exit combat, prose-panel reappears

**Bug #2 (Action Economy)**
- ✅ Player moves once, cannot move again without turn ending
- ✅ After moving, only Attack button appears (if adjacent)
- ✅ Click Attack, damage resolves, buttons disappear ("Waiting for enemy...")
- ✅ Enemy acts automatically after short delay
- ✅ Turn rotates, new combatant's options appear
- ✅ No multiple moves/attacks/heals in single turn

**Bug #3 (UI Feedback)**
- ✅ Sidebar shows "ROUND X — Name's Turn" + "Actions Remaining: 1"
- ✅ Sidebar displays turn order (next 3 combatants with initiative)
- ✅ Enemy HP bars visible and update when damage taken
- ✅ Current turn highlighted in turn order
- ✅ Combat log scrolls independently without cover prose

---

## Phase 1 Transition

Once bugs fixed and verified, Phase 0 is **COMPLETE**. Then proceed to Phase 1: **Metadata Infrastructure**

### Phase 1 Deliverables (from PHASE-0-3-ROADMAP.md)
1. **MetadataParser.js** — Parse prose templates for emotion/sfx/npc tags
2. **Update Weaver.js** — Inject metadata parser into displayProse flow
3. **Update all prose templates** — Wrap key phrases in `<emotion>`, `<sfx>`, `<npc>` tags
4. **Fallback handling** — Non-tagged prose still renders cleanly
5. **Prose preview tool** — Dev utility for template testing

### Phase 1 Prose Template Example
```javascript
// Current Phase 0 flat string:
"Your blade finds the gap between corroded plates."

// Phase 1 metadata wrapper:
{
  text: `Your <emotion type="triumph">blade finds the gap</emotion> between corroded plates.`,
  metadata: {
    emotions: ["triumph"],
    sfx: [],
    npcs: [],
    pauseMs: 300
  }
}
```

**Phase 1 will leverage the stable combat system** to test metadata emission during combat prose display—the foundation for Phase 2 (Audio) and Phase 3 (Disposition).

---

## Files Affected (Summary)

| File | Bug(s) | Change |
|------|--------|--------|
| `Game.js` | #1, #2, #3 | Hide prose-panel; track playerActionResolved; update sidebar on turn |
| `style.css` | #1, #3 | Add .hidden class; enhance sidebar styling for turn order + enemy HP |
| `index.html` | #3 | Expand combat-sidebar internals (turn order, action economy, enemy tracker) |
| `CombatManager.js` | #2 | Add `playerActionResolved` flag init |

---

## Special Notes

- **Prose-First Philosophy:** Even during combat, prose is a secondary layer to the tactical grid. The grid is the source of truth for positions/distances. Prose dramatizes.
- **Dual-Model Contract:** Any turn order update comes from `CombatManager.turnOrder[]` (LogicGate dependency). UI reads, never writes.
- **Audio Sync (Preview for Phase 2):** When `setMood('combat')` is called in startCombat, AudioEngine already shifts drones. Phase 1+ will add SFX triggers from prose metadata.

---

## Sign-Off

Once bugs fixed and validation complete, mark Phase 0 as **READY FOR HANDOFF TO PHASE 1**. Generate Phase 1 task list aligned with Metadata Infrastructure roadmap.

