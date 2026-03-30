import type { SessionCommand } from "../commands";
import { buildLedgerEvent, createEventId, createTimestamp } from "../events";
import type { LedgerEvent } from "../events";
import type { AIIntent, ApprovalGate, Campaign, Encounter, SessionRoomState, Token, TranscriptTurn } from "../types";

export interface CommandResult {
  state: SessionRoomState;
  events: LedgerEvent[];
}

export interface CommandOptions {
  random?: () => number;
}

export function createDemoCampaignState(): SessionRoomState {
  const campaign: Campaign = {
    id: "campaign_demo",
    name: "The Candlekeep Breach",
    summary: "A home-group campaign focused on fast tactical play and living-world memory.",
    sessionId: "session_demo"
  };

  const actorIds = {
    gm: "actor_gm",
    fighter: "actor_fighter",
    cleric: "actor_cleric",
    goblin: "actor_goblin"
  };

  const tokens: Record<string, Token> = {
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
  };

  return {
    roomId: "room_demo",
    campaign,
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
    tokens,
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

function rollDie(sides: number, random: () => number): number {
  return Math.floor(random() * sides) + 1;
}

function startEncounter(tokens: Record<string, Token>): Encounter {
  const order = Object.values(tokens)
    .filter((token) => token.inEncounter)
    .sort((left, right) => (right.initiative ?? 10) - (left.initiative ?? 10))
    .map((token) => token.id);

  return {
    id: createEventId("encounter"),
    round: 1,
    turnIndex: 0,
    initiativeOrder: order
  };
}

function upsertApproval(state: SessionRoomState, approval: ApprovalGate): SessionRoomState {
  const approvals = state.approvals.filter((item) => item.id !== approval.id);
  approvals.push(approval);
  return {
    ...state,
    approvals
  };
}

export function applyLedgerEvent(state: SessionRoomState, event: LedgerEvent): SessionRoomState {
  switch (event.type) {
    case "room.join":
      return {
        ...state,
        participants: {
          ...state.participants,
          [event.payload.actorId]: {
            actorId: event.payload.actorId,
            role: event.payload.role as SessionRoomState["participants"][string]["role"],
            connectedAt: event.occurredAt
          }
        }
      };
    case "token.move": {
      const token = state.tokens[event.payload.tokenId];
      if (!token) return state;
      return {
        ...state,
        tokens: {
          ...state.tokens,
          [token.id]: {
            ...token,
            x: event.payload.x,
            y: event.payload.y
          }
        }
      };
    }
    case "combat.start":
      return {
        ...state,
        encounter: {
          id: event.payload.encounterId,
          round: 1,
          turnIndex: 0,
          initiativeOrder: event.payload.initiativeOrder
        }
      };
    case "combat.advance":
      return state.encounter
        ? {
            ...state,
            encounter: {
              ...state.encounter,
              round: event.payload.round,
              turnIndex: event.payload.turnIndex
            }
          }
        : state;
    case "transcript.turn.created":
      return {
        ...state,
        transcript: [...state.transcript, event.payload.turn]
      };
    case "memory.fact.created":
      return {
        ...state,
        memoryFacts: [...state.memoryFacts, event.payload.fact]
      };
    case "world.tick.started":
      return {
        ...state,
        worldClock: event.payload.clock,
        inbox: event.payload.worldEvent
          ? [
              {
                id: event.payload.worldEvent.id,
                title: event.payload.worldEvent.title,
                body: event.payload.worldEvent.summary,
                createdAt: event.payload.worldEvent.createdAt
              },
              ...state.inbox
            ]
          : state.inbox
      };
    case "canon.change.proposed":
      return upsertApproval(state, event.payload.approval);
    case "ai.intent.approved":
      return {
        ...state,
        approvals: state.approvals.map((approval) =>
          approval.id === event.payload.approvalId ? { ...approval, status: "approved" } : approval
        )
      };
    case "ai.intent.rejected":
      return {
        ...state,
        approvals: state.approvals.map((approval) =>
          approval.id === event.payload.approvalId ? { ...approval, status: "rejected" } : approval
        )
      };
    case "recap.updated":
      return {
        ...state,
        lastRecap: event.payload.recap
      };
    case "service.health.updated":
      return {
        ...state,
        diagnostics: {
          ...state.diagnostics,
          [event.payload.service]: event.payload.status
        }
      };
    default:
      return state;
  }
}

export function applySessionCommand(
  state: SessionRoomState,
  command: SessionCommand,
  options: CommandOptions = {}
): CommandResult {
  if (state.processedCommandIds.includes(command.commandId)) {
    return {
      state,
      events: []
    };
  }

  const random = options.random ?? Math.random;
  const events: LedgerEvent[] = [];

  switch (command.type) {
    case "room.join":
      events.push(buildLedgerEvent(state.campaign, "room.join", { actorId: command.actorId, role: command.role }));
      break;
    case "token.move":
      events.push(buildLedgerEvent(state.campaign, "token.move", { tokenId: command.tokenId, x: command.x, y: command.y }));
      break;
    case "dice.roll": {
      const rolls = Array.from({ length: command.count }, () => rollDie(command.sides, random));
      const total = rolls.reduce((sum, value) => sum + value, 0) + command.modifier;
      events.push(
        buildLedgerEvent(state.campaign, "dice.roll", {
          actorId: command.actorId,
          label: command.label,
          total,
          rolls,
          modifier: command.modifier
        })
      );
      break;
    }
    case "combat.start": {
      const encounter = startEncounter(state.tokens);
      events.push(
        buildLedgerEvent(state.campaign, "combat.start", {
          encounterId: encounter.id,
          initiativeOrder: encounter.initiativeOrder
        })
      );
      break;
    }
    case "combat.advance": {
      if (!state.encounter) break;
      const nextTurnIndex = (state.encounter.turnIndex + 1) % state.encounter.initiativeOrder.length;
      const nextRound = nextTurnIndex === 0 ? state.encounter.round + 1 : state.encounter.round;
      events.push(
        buildLedgerEvent(state.campaign, "combat.advance", {
          encounterId: state.encounter.id,
          turnIndex: nextTurnIndex,
          round: nextRound
        })
      );
      break;
    }
    case "canon.change.propose": {
      const approval: ApprovalGate = {
        id: createEventId("approval"),
        type: "canon-change",
        title: command.title,
        detail: command.detail,
        status: "pending",
        linkedId: command.sourceIntentId,
        requestedAt: createTimestamp()
      };
      events.push(buildLedgerEvent(state.campaign, "canon.change.proposed", { approval }));
      break;
    }
    case "ai.intent.approve": {
      const intent: AIIntent = {
        id: command.intentId,
        type: command.intentType,
        title: command.title,
        detail: command.detail,
        suggestedBy: "copilot"
      };
      events.push(buildLedgerEvent(state.campaign, "ai.intent.approved", { approvalId: command.approvalId, intent }));
      break;
    }
    case "ai.intent.reject":
      events.push(buildLedgerEvent(state.campaign, "ai.intent.rejected", { approvalId: command.approvalId, reason: command.reason }));
      break;
  }

  const nextState = events.reduce((currentState, event) => applyLedgerEvent(currentState, event), {
    ...state,
    processedCommandIds: [...state.processedCommandIds, command.commandId]
  });

  return {
    state: nextState,
    events
  };
}

export function createTranscriptTurn(speaker: string, speakerRole: TranscriptTurn["speakerRole"], text: string): TranscriptTurn {
  return {
    id: createEventId("turn"),
    speaker,
    speakerRole,
    text,
    occurredAt: createTimestamp()
  };
}
