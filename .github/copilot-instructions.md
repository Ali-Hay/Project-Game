# Copilot Instructions for Project Game

## Project Overview: Chronicle: Zero
A browser-based AI-native TTRPG engine bridging interactive fiction and tactical gameplay. The core philosophy separates **deterministic rules** from **generative narrative**, eliminating "AI hallucinations" through a dual-model architecture. Dark fantasy setting (chapel/undead horror theme) powered by D&D 5e mechanics, procedural audio, and asynchronous world simulation.

## Design Pillars

### 1. Dual-Model Architecture: Determinism + Imagination
**The Logic Gate** (deterministic authority): A "headless" DM that only sees numbers and state. Manages 5e rules, inventory, NPC relationships, and world flags. If a door is locked in the database, it stays locked regardless of what the narrative model wants.

**The Weaver** (generative layer): Translates raw Logic Gate data (e.g., "Miss, 14 vs 16 AC, Slashing") into prose tailored to dramatic pacing and emotional resonance. Acts as creative interpreter, never as truth arbiter.

**Design Constraint**: Weaver output can never override LogicGate state. Always query LogicGate for authoritative game state before generating prose.

### 2. Deterministic Persistence
Every NPC and location is a database object with persistent flags (e.g., `Status: Burned`, `Relation: Hostile`). The world evolves asynchronously—faction wars progress whether the player witnesses them. This eliminates "improv with a goldfish" feel.

### 3. Reactive Ambient Synthesis
Audio anchors imagination without uncanny AI voices. Contextual drones shift pitch based on location mood. SFX and leitmotifs inject without breaking immersion.

### 4. Prose-First, Minimalist UI
Typography and spacing control pacing. Combat grid appears only when needed. Character sheet collapses by default. Everything serves the narrative.

## Architecture Essentials

### Core System Design
The game uses an **entity-component pattern** where all systems extend `GameObject` and register with `Game.entities[]`:
- [Game.js](Game.js): Main orchestrator managing game loop, state machine, input
- [LogicGate.js](LogicGate.js): Deterministic DM—D&D 5e rules arbiter, player/world state keeper (single source of truth)
- [Weaver.js](Weaver.js): Generative narrative engine translating logic data to prose with async display
- [CombatManager.js](CombatManager.js): Turn-based combat controller, initiative, attack resolution
- [MapRenderer.js](MapRenderer.js): Canvas rendering + mood-based ambient colors, tactical grid for combat
- [AudioEngine.js](AudioEngine.js): Procgen Web Audio synthesizer, mood-keyed drones, NPC leitmotifs
- [ShadowSim.js](ShadowSim.js): Background faction simulation (asynchronous world evolution, alerts)
- [ParticleSystem.js](ParticleSystem.js): Visual effect bursts for impacts, spells, atmosphere

### State Flow
Game operates via state machine in `Game.state`: `'intro'` → `'exploration'` → `'combat'` → `'dialogue'` → `'gameover'`. State transitions trigger [Weaver](Weaver.js) prose calls and [AudioEngine](AudioEngine.js) mood shifts.

### Data Model
**LogicGate.world** is the single source of truth:
```javascript
world = {
  currentLocation,
  locations: { [id]: { name, mood, connections, objects, npcs, enemies, flags } },
  npcs: { [id]: { name, status, disposition, leitmotif, hp, ac, attack } },
  factions: { [id]: { power, goal, territory } },
  globalFlags: { chapelPurified, hordeAlerted }
}
```

## Critical Patterns

### The Dual-Model Flow (LogicGate → Weaver)
1. **Player Action** → LogicGate validates and resolves (rolls d20, modifies world state, returns raw result)
2. **Raw Result** → Weaver receives deterministic data: `{hit: true, damage: 14, crit: false, targetName: 'Risen Guardian'}`
3. **Prose Generation** → Weaver selects/craft narrative template, substitutes values, applies emotional tone
4. **UI Sync** → Async prose display to `#prose-scroll`, character sheet updates via LogicGate state

**Critical Rule**: Weaver never modifies world state. It reads LogicGate, never writes to it.

### Narrative Integration & State Flags
[Weaver.js](Weaver.js) stores prose templates keyed by `location_event` or `result_type` (e.g., `chapel_entrance_first`, `attack_hit`, `ghost_priest_first`). Use `getRandomNarrative(key, data)` to pull variations. Data substitution uses `{damage}`, `{amount}`, `{targetName}` syntax.

Templates reference [LogicGate.world flags](LogicGate.js#L37) to branch narrative (e.g., if `altarCleansed === true`, show purified prose instead of defiled). Always check flags before rendering to ensure narrative consistency.

Prose display is **asynchronous**—always await `displayProse()` and `displaySingle()` calls before proceeding to sync UI state and unblock player input.

### Combat Resolution (Logic → Drama)
[CombatManager.js](CombatManager.js) manages `turnOrder[]` sorted by initiative. Player attacks via `playerAttack(targetIdx)`, enemies via `enemyTurn(turnEntry)`. Both return raw result objects:
```javascript
{ hit: bool, damage: number, crit: bool, attackRoll: number, targetName: string, defeated: bool }
```
Game then calls `Weaver.getRandomNarrative('attack_hit', {damage: 14})` to dramatize. Weaver knows *what happened* (from LogicGate), chooses *how to describe it*.

### Audio-Narrative Sync & Character Leitmotifs
Each location has a `mood` property (e.g., `'dread'`, `'sacred'`, `'combat'`, `'calm'`). When location changes, [Game](Game.js) must call `AudioEngine.setMood(mood)` to shift ambient drones procedurally.

Each NPC has a `leitmotif` field (e.g., `'sacred'` for Father Aldric). When NPC appears in prose, [AudioEngine](AudioEngine.js) weaves their leitmotif frequency into the ambient dronefilter—subconscious character recognition without voice acting.

Moods defined with `baseFreq`, `detune`, `volume`, `filterFreq` for procedural ambience:
```javascript
dread: { baseFreq: 55, volume: 0.08, detune: -10, filterFreq: 200 }
```

### Asynchronous World Evolution (The Shadow-Sim)
[ShadowSim.js](ShadowSim.js) runs `tick()` every player turn. It simulates faction power while the player acts:
- Undead horde grows (+2 power/turn) unless `chapelPurified === true`
- Survivor faction weakens (-1 power/turn) as resources dwindle
- After turn 8 with horde unpurified, sets `hordeAlerted === true` (escalates stakes)
- Returns random flavor text for `#world-ticker` UI to show world evolving beyond player focus

This is the core "Deterministic Persistence" pillar: the world doesn't pause for the player.

## Development Workflows

### Adding a New Location (State + Prose + Audio)
1. Add location object to [LogicGate.world.locations](LogicGate.js#L37) with `name, description, mood, connections, objects, flags`
2. Pick a semantic `mood` (influences [AudioEngine](AudioEngine.js) timbre and [MapRenderer](MapRenderer.js) colors)
3. Define prose templates in [Weaver.narrativeTemplates](Weaver.js#L7) with `{location}_first` and `{location}_return` keys
4. Connect to other locations via `connections: ['otherLocationId']` in LogicGate
5. Test audio transition by checking [AudioEngine.moods](AudioEngine.js#L24) has the mood defined

### Branching Narrative with World Flags
Use [LogicGate.world location flags](LogicGate.js#L47) to track state changes. Example: `altarCleansed` flag changes prose:
```javascript
// In Weaver.narrativeTemplates
chapel_nave_return: [
  world.locations.chapel_nave.flags.altarCleansed 
    ? "The altar gleams with restored holiness..."
    : "The altar remains defiled, a scar of desecration..."
]
```
Always check LogicGate.world flags *before* rendering prose to ensure continuity.

### Adding Combat Encounters
1. Create enemy template in [LogicGate.world.npcs](LogicGate.js#L78) with `name, status, ac, hp, maxHp, attack: {bonus, damage}, leitmotif`
2. Call `CombatManager.startCombat(['skeleton_warrior', 'skeleton_warrior'])` from [Game](Game.js) during exploration flow
3. This auto-rolls initiative, initializes [MapRenderer.initCombatGrid()](MapRenderer.js#L31) for visual display
4. Combat loop calls `playerAttack()` or `enemyTurn()`, returns raw result, triggers [Weaver prose](Weaver.js#L95)
5. On enemy defeat, [ShadowSim.tick()](ShadowSim.js) may advance world state (horde grows if not stopped)

### Modifying D&D Mechanics
[LogicGate](LogicGate.js) is the only source of truth for rule resolution:
- `getMod(stat)`: Converts 5e ability score to modifier
- `rollCheck(stat, dc)`: Full d20+mod+proficiency vs DC, handles nat 20/1
- `rollAttack(targetAc)`: Weapon attack with crit on 20, auto-selects proficiency
- `applyDamage(target, amount)`: Updates player/NPC hp (no direct edits!)

Do NOT let [Weaver](Weaver.js) or any UI layer modify LogicGate state directly. Always call LogicGate methods.

## UI Integration Points
- `#prose-scroll`: Target for [Weaver.displayProse()](Weaver.js#L106) calls
- `#choices-panel`: Populated with choice buttons; numeric input (1-9) triggers clicks
- `#combat-log`, `#combat-actions`: Updated during combat
- `#character-sheet`: [Game.updateCharSheet()](Game.js#L69) refreshes from player state
- `#audio-mood`: Displays current mood name
- `#world-ticker`: Shows [ShadowSim](ShadowSim.js) events

## Prose-First Design Principles
- Type spacing and delays (`displayProse` with `delay: 400ms`) control narrative pacing—don't rush revelations
- Use `<span class="highlight">` for emotional beats and `<span class="damage">` for mechanical impacts to create visual rhythm
- Avoid UI clutter during prose sequences; collapse character sheet (`collapsed` class) by default
- Combat grid only appears during `state: 'combat'`; during exploration, let imagination dominate
- Every template substitution (`{damage}`, `{targetName}`) ties mechanical outcome to prose—never separate narrative from logic

## Debugging Patterns
- **World state inconsistency**: Compare player action result from [LogicGate](LogicGate.js) with displayed prose—prose should always reflect what LogicGate says, never contradict it
- **Combat stuck**: Check [CombatManager.active](CombatManager.js#L7) and `currentTurn` index; verify enemies pass `hp > 0` filter
- **Audio not syncing**: Verify [AudioEngine.setMood()](AudioEngine.js#L80) was called after location change. Check that mood key exists in [moods object](AudioEngine.js#L24)
- **Leitmotif not playing**: Confirm NPC has `leitmotif` field in [LogicGate.world.npcs](LogicGate.js#L82) that matches a valid mood key

## Key File Cross-References
- Player state flows: [Game](Game.js#L7) → [LogicGate.player](LogicGate.js#L8) → [Game.updateCharSheet()](Game.js#L69)
- Prose triggered by: Combat results → [Weaver.getNarrative()](Weaver.js#L95) → [Game](Game.js) calls `displayProse()`
- World changes: Any change to [LogicGate.world](LogicGate.js#L19) affects [ShadowSim](ShadowSim.js#L18) faction simulation and [Weaver](Weaver.js) branching
- Audio integration: [Game.state](Game.js#L8) changes → [AudioEngine.setMood()](AudioEngine.js#L80) updates procedural drone
