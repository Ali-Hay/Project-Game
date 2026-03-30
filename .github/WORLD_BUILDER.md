# World Builder System Architecture

## Intent & Goals

The main menu should feel like opening an interactive worldbook. Users either:
1. **Select a pregenerated world** (instantly playable)
2. **Build a custom world** (interactive wizard)
3. **Load a saved world** (from localStorage)

This is where the SLM orchestration begins. The builder is the user's entry point to the dual-model philosophy.

## UI Flow

```
┌─────────────────────────────────────────┐
│         CHRONICLE: ZERO                 │
│                                         │
│  [1] New World (Presets)               │
│  [2] Build Your Own World              │
│  [3] Load Saved Game                   │
│                                         │
│  Audio: ♪ (toggleable)                 │
└─────────────────────────────────────────┘
        ↓         ↓          ↓
     (1)       (2)        (3)
      │         │          │
      ├─────────┴──────────┤
      ↓                    ↓
  Preset Menu         Saved Games
  ├─ Chapel           ├─ World_v1.json
  │  Horrors          ├─ Custom_01.json
  ├─ Ruins
  │  Ascendant
  └─ Mystic
     Sanctum
      │
      └─→ Game.js loads world.json
```

## Preset Worlds (Included)

Each preset is a fully-configured JSON in `.github/worlds/`:

### 1. Chapel Horrors (MVP)
- 1 location: Chapel Entrance
- 2 NPCs: Father Aldric (ghost), Mira (survivor)
- 1 enemy type: Skeleton Warrior
- Mood: Dread
- Duration: 15-20 min

### 2. Ruins Ascendant
- 5 locations: Chapel + Forest + Village + Crypt + Tower
- 5 NPCs with disposition arcs
- 3 combat encounters + miniboss
- Factions: Undead Horde vs Survivors
- Duration: 45-60 min

### 3. Mystic Sanctum
- 3 locations: Garden + Library + Inner Sanctum
- Puzzle-focused, minimal combat
- 3 mysterious NPCs, heavy dialogue
- Duration: 30-40 min

## World Builder Workflow (Option 2)

```
Step 1: World Metadata
├─ Name: "My Dark Temple"
├─ Setting: Dark Fantasy / Undead / Religion
├─ Difficulty: 1 (Casual) → 5 (Nightmare)
└─ Click → Next

Step 2: Player Build
├─ Class selector (Paladin / Wizard / Rogue / Cleric)
├─ Auto-generate stats based on class
├─ Equipment selector
└─ Click → Next

Step 3: Location Builder (Repeatable)
├─ Location name: "The Temple Foyer"
├─ Mood: [dropdown: dread/sacred/mystery/calm/etc]
├─ Description: [text area for atmosphere]
├─ Connected locations: [multiselect existing locations]
└─ Add Objects / NPCs / Enemies → Next

Step 4: NPC Builder (Per-location)
├─ Name, Role (ally/neutral/enemy)
├─ Starting disposition
├─ Leitmotif [audio mood]
├─ Simple dialogue variant selector
└─ Add to location → Next

Step 5: Combat Encounter Builder
├─ Select enemies (pool from preset templates)
├─ Set encounter difficulty (Easy/Medium/Hard)
├─ Pick trigger (auto on entry / on button click)
└─ Next

Step 6: Preview & Save
├─ Show JSON preview
├─ Validate against WORLD_CONFIG schema
├─ Save to localStorage as `world_${timestamp}.json`
├─ Option to export as .json file
└─ Play!
```

## SLM Intent Markers

When vibe coding the builder in Claude Code, embed these markers for GPT/Gemini alignment:

```javascript
// INTENT: "Create a compact, tabbed UI for world metadata"
// CONSTRAINT: "No libraries beyond vanilla DOM; under 50 lines"
// VALIDATE_AGAINST: "WORLD_CONFIG.md schema"

// INTENT: "Auto-populate class stats using 5e rules"
// LOGIC_AUTHORITY: "LogicGate.getMod(stat) must be called"

// INTENT: "Allow prose template preview before save"
// CONTEXT: "Show how prose + metadata tags will render"
```

## Technical Integration

### Game.js Integration

```javascript
// On page load
const savedWorld = localStorage.getItem('currentWorld');
if (!savedWorld) {
  // Show menu
  showMainMenu();
} else {
  // Load world and start game
  const world = JSON.parse(savedWorld);
  game.logic.world = world;
  game.runIntro();
}

// When user selects/builds world
function onWorldSelected(worldJson) {
  localStorage.setItem('currentWorld', JSON.stringify(worldJson));
  game.logic.initializeWithWorld(worldJson);
  game.runIntro();
}
```

### LogicGate Integration

```javascript
class LogicGate extends GameObject {
  initializeWithWorld(worldJson) {
    // Validate worldJson against schema
    if (!this.validateWorld(worldJson)) {
      throw new Error('World schema invalid');
    }
    this.world = worldJson;
    this.player = worldJson.player;
    // Etc.
  }
  
  validateWorld(world) {
    // Check required fields (meta, player, locations, etc)
    return true/false;
  }
}
```

## Preset World Files

Each preset lives in `.github/worlds/preset_${name}.json`:

```
.github/
  worlds/
    preset_chapel_horrors.json
    preset_ruins_ascendant.json
    preset_mystic_sanctum.json
```

Format: Standard WORLD_CONFIG.md JSON structure.

## MVP Completion Criteria

✅ Main menu appears before Game.js starts
✅ User can select "Chapel Horrors" preset → game loads
✅ User can click "Build World" → multi-step wizard
✅ Wizard generates valid WORLD_CONFIG.md JSON
✅ Game.js loads generated world successfully
✅ Prose templates render with metadata tags (Phase 1)

## Future Enhancements

- World sharing (export/import URLs)
- AI-assisted world description generation
- Difficulty scaling (auto-adjust enemy HP/damage)
- Branching story templates (preset quest arcs)
