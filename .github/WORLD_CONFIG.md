# World Configuration Schema

## Purpose
All worlds conform to this structure. World builder generates worlds that validate against this schema. Metadata system (Phase 1) extends this structure.

## Core Structure

```javascript
{
  meta: {
    id: string,           // "chapel_horrors_v1"
    name: string,         // "The Chapel Horrors"
    setting: string,      // "Dark Fantasy, Undead"
    difficulty: number,   // 1-5
    estimatedPlaytime: number // minutes
  },
  
  player: {
    class: string,        // "Paladin"
    level: number,
    stats: { STR, DEX, CON, INT, WIS, CHA },
    inventory: Item[],
    spellSlots: {}
  },
  
  locations: {
    [locationId]: {
      name: string,
      mood: string,              // "dread", "sacred", etc
      description: string,       // For builder/ref
      connections: string[],     // Adjacent location IDs
      
      objects: Object[],         // Doors, chests, etc
      npcs: NPC[],              // Characters present
      enemies: Enemy[],         // Combat encounters
      
      flags: {
        visited: boolean,
        [customFlag]: any       // Location-specific state
      },
      
      // METADATA (Phase 1)
      prose: {
        first: ProseTpl[],      // First visit
        return: ProseTpl[],     // Subsequent visits
        atmosphere: string      // Mood descriptor for SLM
      }
    }
  },
  
  npcs: {
    [npcId]: {
      name: string,
      status: string,           // "alive", "spectral", "fallen"
      role: string,             // "ally", "quest-giver", "neutral"
      
      // DISPOSITION (Phase 3)
      disposition: number,      // -100 to 100, affects dialogue
      dispositionThresholds: {
        veryHostile: -80,
        hostile: -40,
        neutral: 0,
        friendly: 40,
        veryFriendly: 80
      },
      
      leitmotif: string,        // Audio mood for this NPC
      ac: number,
      hp: number,
      maxHp: number,
      
      flags: {
        spoken: boolean,
        questGiven: boolean,
        appeased: boolean,
        [customFlag]: any
      },
      
      // METADATA + PROSE (Phase 1-2)
      prose: {
        first_meeting: ProseTpl[],
        dialogue_hostile: ProseTpl[],
        dialogue_neutral: ProseTpl[],
        dialogue_friendly: ProseTpl[],
        [mood]_[action]: ProseTpl[]  // e.g., "dread_departure"
      },
      
      // NPC-Specific audio
      audio: {
        leitmotif: string,
        leitmotifFreq: number,    // e.g., 330 for sacred
        entryStinger: string      // Optional SFX on first appearance
      }
    }
  },
  
  enemies: {
    [enemyId]: {
      name: string,
      ac: number,
      hp: number,
      maxHp: number,
      attack: {
        bonus: number,
        damage: string          // "1d6+2"
      },
      leitmotif: string,
      
      prose: {
        first_encounter: ProseTpl[],
        defeated: ProseTpl[]
      }
    }
  },
  
  factions: {
    [factionId]: {
      name: string,
      power: number,            // 0-100
      goal: string,
      territory: string[],      // Location IDs
      
      // ShadowSim rules
      rules: {
        powerGainPerTurn: number,
        powerLossPerTurn: number,
        alertThreshold: number,
        escalationStates: string[] // "dormant", "aware", "aggressive", "siege"
      }
    }
  },
  
  globalFlags: {
    [flagName]: boolean         // World-state tracking
  }
}
```

## ProseTpl Type

```javascript
{
  text: string,           // The prose block (can contain HTML spans)
  tags: {
    emotions?: string[],  // ["dread", "wonder"] → Phase 2 audio
    sfx?: string[],       // ["metal_scrape"] → Phase 2 SFX
    npcs?: string[],      // ["ghost_priest"] → Phase 2 leitmotifs
    pauses?: number       // ms delay before next prose
  },
  requires?: {
    flags?: Record<string, boolean>,      // Only show if flags match
    dispositionMin?: number,              // Only if npc.disposition > this
    playerHpMin?: number,
    [condition]: any
  }
}
```

## World Sizes (MVP Reference)

**MVP (Phase 0):** 1 location, 1-2 NPCs, 1 combat encounter
**v1 Full:** 5 locations, 5 NPCs, 3-5 encounters, 2-3 factions

## Builder Tool Responsibility

The world builder generates this JSON structure via:
1. Interactive form (location, NPC, enemy creation)
2. Preset templates (pregenerated worlds)
3. Validation against this schema
4. Export as `world_${id}.json`

Game.js loads world JSON at startup, initializes LogicGate with it.
