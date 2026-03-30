# Chronicle: Zero v1 Development Roadmap

**Date:** March 5, 2026 | **Status:** Architecture Draft | **Approval:** Pending

---

## Milestone Overview

This v1 development cycle focuses on **Phase 0 (Foundation): World Builder/Menu**, then **Phases 1-3 (Content Layers): Metadata → Audio → Disposition**.

The philosophies behind this sequencing:
1. **Phase 0** creates the data structure that everything else feeds into
2. **Phases 1-3** progressively enhance that structure with semantic richness

---

## PHASE 0: World Builder + Main Menu (Foundation)

**Duration:** 6-8 hours | **Priority:** CRITICAL (blocks game entry)

### Deliverables
- [ ] `Menu.js` class with multi-screen navigation
- [ ] Main menu UI (New / Build / Load / Exit)
- [ ] Preset world loader (`.github/worlds/preset_*.json`)
- [ ] Saved game localStorage integration
- [ ] World validator (against WORLD_CONFIG schema)
- [ ] LogicGate.initializeWithWorld() method
- [ ] MVP preset: "Chapel Horrors" (1 location, 2 NPCs, 1 encounter)

### MVP Scope
- **Preset Selection Only** (no interactive builder yet)
- Menu → Select "Chapel Horrors" → Game loads → Intro plays
- Option to save progress locally
- Minimal styling (prose-first, dark aesthetic)

### Files to Create/Modify
- **New:** `Menu.js`, `.github/worlds/preset_chapel_horrors.json`
- **Modify:** `index.html` (add menu layer), `Game.js` (adapt constructor), `LogicGate.js` (add initializeWithWorld), `style.css` (menu styling)

### Verification Criteria
- ✅ Game starts with menu (not auto-intro)
- ✅ Selecting preset loads world correctly
- ✅ World data matches WORLD_CONFIG schema
- ✅ Game runs intro without errors
- ✅ Saved games persist across refresh

### Context Files
- `.github/WORLD_CONFIG.md` (schema reference)
- `.github/WORLD_BUILDER.md` (UI flow)
- `.github/MENU_SYSTEM.md` (technical integration)

---

## PHASE 1: Metadata Infrastructure

**Duration:** 4-6 hours | **Priority:** HIGH (enables Phases 2-3)

**Depends On:** Phase 0 ✓

### Deliverables
- [ ] Prose template metadata parser (emotion, sfx, npc, pause tags)
- [ ] WORLD_CONFIG.js validator + stringBuilder
- [ ] Update all prose templates to include metadata tags
- [ ] Fallback handling (unmeta'd prose still works)
- [ ] Prose preview tool (shows rendered + metadata)

### Example Implementation
```javascript
// Raw template (Phase 0)
`Your blade finds the gap between corroded plates.`

// Metadata template (Phase 1)
{
  text: `Your <emotion type="triumph">blade finds the gap</emotion> 
         between corroded plates. 
         <sfx trigger="metal_scrape">The impact jars your arm</sfx>.`,
  tags: {
    emotions: ["triumph"],
    sfx: ["metal_scrape"],
    pauses: 300
  }
}
```

### Files to Create/Modify
- **New:** `MetadataParser.js`, `.github/WORLD_CONFIG.js` (validator)
- **Modify:** `Weaver.js` (add parser), all prose templates in preset worlds

### Verification Criteria
- ✅ Prose templates render with metadata intact
- ✅ Metadata tags extract correctly
- ✅ Fallback prose (no tags) still displays
- ✅ Parser doesn't break on edge cases

---

## PHASE 2: Audio Enhancement + Leitmotif System

**Duration:** 6-8 hours | **Priority:** HIGH (sensory pillar)

**Depends On:** Phase 0 ✓, Phase 1 ✓

### Deliverables
- [ ] NPC per-NPC leitmotif blending (into ambient drone)
- [ ] SFX trigger system (extract sfx tags, play samples)
- [ ] Emotion metadata → AudioEngine parameter mapping
- [ ] Procedural SFX generation (metal, stone, flesh impacts)
- [ ] Leitmotif fade-in/out when NPC present

### Key Flow
```javascript
// When prose with <npc id="ghost_priest"> is displayed:
Weaver parses metadata → finds npc="ghost_priest"
→ Fetches ghost_priest.audio.leitmotif = "scared" (frequency 330Hz)
→ Calls AudioEngine.blendLeitmotif("ghost_priest", 330, 0.4, duration=2000)
→ AudioEngine weaves frequency into current drone over 2 seconds

// When <sfx trigger="metal_scrape"> is parsed:
Weaver → AudioEngine.playSfx("metal_scrape", {volume: 0.6, delay: 200})
→ Procedural SFX plays proportional to prose display timing
```

### Files to Create/Modify
- **New:** `AudioSynth.js` (procedural SFX library)
- **Modify:** `AudioEngine.js` (leitmotif blending, SFX playback), `Weaver.js` (metadata → audio dispatch)

### Verification Criteria
- ✅ Leitmotif audible when NPC prose displays
- ✅ SFX triggers play without stutter
- ✅ Audio doesn't overlap dissonantly
- ✅ Mood transitions remain smooth

---

## PHASE 3: NPC Disposition Engine

**Duration:** 8-10 hours | **Priority:** HIGH (relationship arc pillar)

**Depends On:** Phase 0 ✓, Phase 1 ✓

### Deliverables
- [ ] Disposition change system (player choice → ±disposition)
- [ ] Disposition-keyed prose variants (hostile vs friendly dialogue)
- [ ] Choice consequence tracking (choice → disposition → prose branch)
- [ ] NPC behavior shift (speech tone, combat difficulty, alliance status)
- [ ] World flags triggered by disposition milestones (e.g., "ally_ghostpriest" on disposition > 50)

### Example Implementation
```javascript
// In choice consequence system
player_choice: "Comfort Father Aldric's spirit"
→ LogicGate.updateDisposition('ghost_priest', +20)
→ ghost_priest.disposition = 70 (now "veryFriendly")
→ Next prose uses ghost_priest_dialogue_veryFriendly template instead of neutral
→ ghost_priest reveals hidden quest (world flag set)

// Prose variants keyed by disposition
narrativeTemplates: {
  ghost_priest_dialogue_hostile: ["Your intrusion is an insult..."],
  ghost_priest_dialogue_neutral: ["What brings you here..."],
  ghost_priest_dialogue_friendly: ["Perhaps you can help..."],
  ghost_priest_dialogue_veryfriendly: ["You have my trust..."]
}
```

### Files to Create/Modify
- **New:** `DispositionSystem.js`
- **Modify:** `LogicGate.js` (add updateDisposition), `Game.js` (choice consequence dispatch), world JSON templates (add disposition-keyed prose)

### Verification Criteria
- ✅ Choosing kind dialogue increases NPC disposition
- ✅ Prose changes based on disposition threshold
- ✅ Hostile NPCs act differently (higher damage, refuse quests)
- ✅ Friendly NPCs unlock side quests
- ✅ World flags sync correctly with disposition milestones

---

## Wave Execution Plan

```
WAVE 1 (Parallel)
├─ Phase 0: Menu + World Builder
└─ Research: Audio synthesis library selection

WAVE 2 (Sequential after Wave 1)
├─ Phase 1: Metadata Infrastructure
└─ Phase 2: Audio Enhancement (can start while 1 in progress)

WAVE 3 (Sequential after Wave 2)
└─ Phase 3: NPC Disposition Engine

WAVE 4 (Parallel with Wave 3)
├─ Preset world expansion (additional worlds)
└─ Bug fixes + Polish
```

---

## Version Integration

| Phase | Adds | Game Feels Like |
|-------|------|-----------------|
| Phase 0 | Menu, world selection | "I'm loading a narrated adventure" |
| Phase 1 | Semantic prose structure | "This prose is... intentional" |
| Phase 2 | Audio atmosphere + NPC voices | "This world is alive" |
| Phase 3 | Relationship arcs, consequence | "My choices matter" |

---

## Success Criteria (v1 Complete)

- [ ] Game launches with main menu
- [ ] User can select preset world and play
- [ ] Prose displays with emotion/SFX metadata intact
- [ ] Audio drones + leitmotifs create immersion
- [ ] NPC disposition changes based on player choice
- [ ] World state reflects player decisions
- [ ] Save/load works correctly
- [ ] No console errors or state corruption

---

## Future Phases (v1.1+)

- **Phase 4:** Interactive world builder (Steps 1-6)
- **Phase 5:** ShadowSim expansion (faction wars, timers)
- **Phase 6:** Additional preset worlds (Ruins Ascendant, Mystic Sanctum)
- **Phase 7:** Multiplayer save sharing, modding API

---

## Document References

- `.github/copilot-instructions.md` — AI agent guidelines
- `.github/Vision.md` — Design philosophy
- `.github/WORLD_CONFIG.md` — Data schema
- `.github/WORLD_BUILDER.md` — UI/UX architecture
- `.github/MENU_SYSTEM.md` — Technical integration
