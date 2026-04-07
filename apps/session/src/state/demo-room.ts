import type { SessionRoomState } from "@project-game/domain";

export function createDemoCampaignState(): SessionRoomState {
  const actorIds = {
    gm: "actor_gm",
    fighter: "actor_fighter",
    cleric: "actor_cleric",
    goblin: "actor_goblin"
  };

  return {
    roomId: "room_demo",
    campaign: {
      id: "campaign_demo",
      name: "The Candlekeep Breach",
      summary: "A home-group campaign focused on fast tactical play and living-world memory.",
      sessionId: "session_demo"
    },
    scene: {
      id: "scene_gatehouse",
      name: "Broken Gatehouse",
      mapId: "map_gatehouse",
      activeLayerIds: ["layer_base", "layer_fog"],
      description: "Rain lashes the ruined gatehouse while the war camp stirs beyond the walls."
    },
    map: {
      id: "map_gatehouse",
      name: "Gatehouse Assault",
      gridSize: 70,
      layers: [
        { id: "layer_base", name: "Terrain", kind: "terrain" },
        { id: "layer_fog", name: "Fog of War", kind: "fog" }
      ]
    },
    actors: {
      [actorIds.gm]: { id: actorIds.gm, name: "Dungeon Master", role: "gm", kind: "npc" },
      [actorIds.fighter]: {
        id: actorIds.fighter,
        name: "Mira Vale",
        role: "player",
        kind: "pc",
        sheet: {
          level: 5,
          className: "Fighter",
          ancestry: "Human",
          armorClass: 18,
          hitPoints: { current: 42, max: 47 },
          spellSlots: {},
          inventory: ["Longsword", "Shield", "Potion of Healing"]
        }
      },
      [actorIds.cleric]: {
        id: actorIds.cleric,
        name: "Thorn Ashdown",
        role: "player",
        kind: "pc",
        sheet: {
          level: 5,
          className: "Cleric",
          ancestry: "Dwarf",
          armorClass: 17,
          hitPoints: { current: 31, max: 36 },
          spellSlots: { "1": 4, "2": 3, "3": 2 },
          inventory: ["Mace", "Holy Symbol", "Prayer Book"]
        }
      },
      [actorIds.goblin]: { id: actorIds.goblin, name: "Goblin Skirmisher", role: "agent", kind: "creature" }
    },
    tokens: {
      token_fighter: {
        id: "token_fighter",
        actorId: actorIds.fighter,
        label: "Mira",
        x: 3,
        y: 5,
        inEncounter: true
      },
      token_cleric: {
        id: "token_cleric",
        actorId: actorIds.cleric,
        label: "Thorn",
        x: 4,
        y: 5,
        inEncounter: true
      },
      token_goblin: {
        id: "token_goblin",
        actorId: actorIds.goblin,
        label: "Goblin Skirmisher",
        x: 8,
        y: 4,
        inEncounter: true
      }
    },
    participants: {},
    transcript: [],
    memoryFacts: [],
    worldClock: {
      tick: 1,
      phase: "session",
      currentDay: 12
    },
    factions: [
      { id: "faction_empire", name: "The Ashen Empire", pressure: 58 },
      { id: "faction_rebels", name: "Lantern Rebels", pressure: 44 }
    ],
    fronts: [{ id: "front_siege", name: "Siege at Candlekeep", progress: 2, stakes: "Break the gate before dawn." }],
    inbox: [],
    approvals: [],
    encounter: null,
    lastRecap: "The party reached the gatehouse and spotted an enemy advance in the rain.",
    diagnostics: {
      voice: "healthy",
      transcript: "degraded",
      ai: "healthy",
      memory: "healthy"
    },
    processedCommandIds: []
  };
}
