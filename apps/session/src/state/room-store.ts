import {
  applyLedgerEvent,
  applySessionCommand,
  assembleContextPack,
  buildLedgerEvent,
  commandSchema,
  createTranscriptTurn,
  intentRequiresApproval,
  type CampaignSummary,
  type LedgerEvent,
  type SessionCommand,
  type SessionRoomState,
  type ServiceHealth
} from "@project-game/domain";
import { createDemoCampaignState } from "./demo-room";

export class RoomStore {
  private readonly rooms = new Map<string, SessionRoomState>();
  private readonly ledgers = new Map<string, LedgerEvent[]>();

  constructor() {
    const demo = createDemoCampaignState();
    this.rooms.set(demo.roomId, demo);
    this.ledgers.set(demo.roomId, []);
  }

  listCampaigns(): CampaignSummary[] {
    return Array.from(this.rooms.values()).map((room) => ({
      roomId: room.roomId,
      campaign: room.campaign,
      activeScene: room.scene,
      diagnostics: room.diagnostics
    }));
  }

  getRoom(roomId: string): SessionRoomState {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Unknown room: ${roomId}`);
    }
    return room;
  }

  getLedger(roomId: string): LedgerEvent[] {
    return this.ledgers.get(roomId) ?? [];
  }

  findRoomByCampaign(campaignId: string): SessionRoomState {
    const room = Array.from(this.rooms.values()).find((entry) => entry.campaign.id === campaignId);
    if (!room) {
      throw new Error(`Unknown campaign: ${campaignId}`);
    }
    return room;
  }

  private getPendingApproval(room: SessionRoomState, approvalId: string) {
    const approval = room.approvals.find((entry) => entry.id === approvalId);

    if (!approval) {
      throw new Error(`Unknown approval: ${approvalId}`);
    }

    if (approval.status !== "pending") {
      throw new Error(`Approval is not pending: ${approvalId}`);
    }

    return approval;
  }

  private createWorldTickEvent(room: SessionRoomState) {
    const nextClock = {
      ...room.worldClock,
      tick: room.worldClock.tick + 1,
      phase: room.worldClock.phase === "session" ? "downtime" : "session",
      currentDay: room.worldClock.phase === "downtime" ? room.worldClock.currentDay + 1 : room.worldClock.currentDay
    } as SessionRoomState["worldClock"];

    return buildLedgerEvent(room.campaign, "world.tick.started", {
      clock: nextClock,
      worldEvent: {
        id: `world_${nextClock.tick}`,
        title: `World tick ${nextClock.tick}`,
        summary: "Factions continue to reposition while the party regroups before the next scene.",
        createdAt: new Date().toISOString()
      }
    });
  }

  private executeApprovedIntent(room: SessionRoomState, approvalId: string): LedgerEvent[] {
    const approval = this.getPendingApproval(room, approvalId);

    if (approval.type !== "ai-intent" || !approval.intentType) {
      throw new Error(`Approval does not resolve an AI intent: ${approvalId}`);
    }

    // The reducer only updates approval bookkeeping. Concrete room effects stay here.
    if (approval.intentType === "world.tick.apply") {
      return [this.createWorldTickEvent(room)];
    }

    throw new Error(`Unsupported AI intent: ${approval.intentType}`);
  }

  dispatchCommand(roomId: string, input: unknown): { state: SessionRoomState; events: LedgerEvent[] } {
    const room = this.getRoom(roomId);
    const command = commandSchema.parse(input) as SessionCommand;
    let executionEvents: LedgerEvent[] = [];

    if (room.processedCommandIds.includes(command.commandId)) {
      return {
        state: room,
        events: []
      };
    }

    if (command.type === "token.move" && !room.tokens[command.tokenId]) {
      throw new Error(`Unknown token: ${command.tokenId}`);
    }

    if (command.type === "ai.intent.request" && !intentRequiresApproval(command.intentType)) {
      throw new Error(`AI intent does not require approval: ${command.intentType}`);
    }

    if (command.type === "ai.intent.approve") {
      executionEvents = this.executeApprovedIntent(room, command.approvalId);
    }

    if (command.type === "ai.intent.reject") {
      this.getPendingApproval(room, command.approvalId);
    }

    const result = applySessionCommand(room, command);
    const events = [...result.events, ...executionEvents];

    if (events.length > 0) {
      this.appendEvents(roomId, events, {
        ...room,
        processedCommandIds: result.state.processedCommandIds
      });
    } else {
      this.rooms.set(roomId, result.state);
    }

    return {
      state: this.getRoom(roomId),
      events
    };
  }

  appendEvents(roomId: string, events: LedgerEvent[], baseState?: SessionRoomState): SessionRoomState {
    let state = baseState ?? this.getRoom(roomId);
    const ledger = this.getLedger(roomId);

    for (const event of events) {
      state = applyLedgerEvent(state, event);
      ledger.push(event);
    }

    this.rooms.set(roomId, state);
    this.ledgers.set(roomId, ledger);
    return state;
  }

  createTranscriptEvent(campaignId: string, speaker: string, speakerRole: "gm" | "player" | "observer" | "agent", text: string) {
    const room = this.findRoomByCampaign(campaignId);
    const turn = createTranscriptTurn(speaker, speakerRole, text);
    const event = buildLedgerEvent(room.campaign, "transcript.turn.created", { turn });
    return {
      roomId: room.roomId,
      state: this.appendEvents(room.roomId, [event]),
      events: [event]
    };
  }

  advanceWorldTick(campaignId: string) {
    const room = this.findRoomByCampaign(campaignId);
    const event = this.createWorldTickEvent(room);

    return {
      roomId: room.roomId,
      state: this.appendEvents(room.roomId, [event]),
      events: [event]
    };
  }

  updateServiceHealth(campaignId: string, service: "voice" | "transcript" | "ai" | "memory", status: ServiceHealth) {
    const room = this.findRoomByCampaign(campaignId);
    const event = buildLedgerEvent(room.campaign, "service.health.updated", {
      service,
      status
    });

    return {
      roomId: room.roomId,
      state: this.appendEvents(room.roomId, [event]),
      events: [event]
    };
  }

  getContext(campaignId: string) {
    const room = this.findRoomByCampaign(campaignId);
    return assembleContextPack(this.getLedger(room.roomId), room.memoryFacts);
  }
}
