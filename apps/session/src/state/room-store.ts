import {
  applyLedgerEvent,
  applySessionCommand,
  assembleContextPack,
  buildLedgerEvent,
  commandSchema,
  createDemoCampaignState,
  createTranscriptTurn,
  type CampaignSummary,
  type LedgerEvent,
  type SessionCommand,
  type SessionRoomState,
  type ServiceHealth
} from "@project-game/domain";

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

  dispatchCommand(roomId: string, input: unknown): { state: SessionRoomState; events: LedgerEvent[] } {
    const room = this.getRoom(roomId);
    const command = commandSchema.parse(input) as SessionCommand;

    if (command.type === "token.move" && !room.tokens[command.tokenId]) {
      throw new Error(`Unknown token: ${command.tokenId}`);
    }

    const result = applySessionCommand(room, command);

    if (result.events.length > 0) {
      this.appendEvents(roomId, result.events, result.state);
    } else {
      this.rooms.set(roomId, result.state);
    }

    return {
      state: this.getRoom(roomId),
      events: result.events
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
    const nextClock = {
      ...room.worldClock,
      tick: room.worldClock.tick + 1,
      phase: room.worldClock.phase === "session" ? "downtime" : "session",
      currentDay: room.worldClock.phase === "downtime" ? room.worldClock.currentDay + 1 : room.worldClock.currentDay
    } as SessionRoomState["worldClock"];

    const worldEvent = {
      id: `world_${nextClock.tick}`,
      title: `World tick ${nextClock.tick}`,
      summary: `Factions continue to reposition while the party regroups before the next scene.`,
      createdAt: new Date().toISOString()
    };

    const event = buildLedgerEvent(room.campaign, "world.tick.started", {
      clock: nextClock,
      worldEvent
    });

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
