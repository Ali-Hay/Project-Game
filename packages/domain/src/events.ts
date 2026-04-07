import type {
  AIIntent,
  ApprovalGate,
  Campaign,
  EntityId,
  MemoryFact,
  TranscriptTurn,
  WorldClock,
  WorldEvent
} from "./types";

export type LedgerEventType =
  | "room.join"
  | "token.move"
  | "dice.roll"
  | "combat.start"
  | "combat.advance"
  | "ledger.event.appended"
  | "transcript.turn.created"
  | "memory.fact.created"
  | "world.tick.started"
  | "canon.change.proposed"
  | "ai.intent.requested"
  | "ai.intent.approved"
  | "ai.intent.rejected"
  | "recap.updated"
  | "service.health.updated";

export interface LedgerEventBase<TType extends LedgerEventType, TPayload> {
  id: EntityId;
  type: TType;
  campaignId: EntityId;
  sessionId: EntityId;
  occurredAt: string;
  payload: TPayload;
}

export type LedgerEvent =
  | LedgerEventBase<"room.join", { actorId: EntityId; role: string }>
  | LedgerEventBase<"token.move", { tokenId: EntityId; x: number; y: number }>
  | LedgerEventBase<
      "dice.roll",
      { actorId: EntityId; label: string; total: number; rolls: number[]; modifier: number }
    >
  | LedgerEventBase<"combat.start", { encounterId: EntityId; initiativeOrder: EntityId[] }>
  | LedgerEventBase<"combat.advance", { encounterId: EntityId; turnIndex: number; round: number }>
  | LedgerEventBase<"ledger.event.appended", { linkedEventId: EntityId }>
  | LedgerEventBase<"transcript.turn.created", { turn: TranscriptTurn }>
  | LedgerEventBase<"memory.fact.created", { fact: MemoryFact }>
  | LedgerEventBase<"world.tick.started", { clock: WorldClock; worldEvent?: WorldEvent }>
  | LedgerEventBase<"canon.change.proposed", { approval: ApprovalGate }>
  | LedgerEventBase<"ai.intent.requested", { approval: ApprovalGate }>
  | LedgerEventBase<"ai.intent.approved", { approvalId: EntityId; intent: AIIntent }>
  | LedgerEventBase<"ai.intent.rejected", { approvalId: EntityId; reason?: string }>
  | LedgerEventBase<"recap.updated", { recap: string }>
  | LedgerEventBase<
      "service.health.updated",
      { service: "voice" | "transcript" | "ai" | "memory"; status: "healthy" | "degraded" | "offline" }
    >;

export function createEventId(prefix: string): EntityId {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createTimestamp(): string {
  return new Date().toISOString();
}

export function buildLedgerEvent<TType extends LedgerEvent["type"]>(
  campaign: Campaign,
  type: TType,
  payload: Extract<LedgerEvent, { type: TType }>["payload"]
): Extract<LedgerEvent, { type: TType }> {
  return {
    id: createEventId(type.replace(/\./g, "_")),
    type,
    campaignId: campaign.id,
    sessionId: campaign.sessionId,
    occurredAt: createTimestamp(),
    payload
  } as Extract<LedgerEvent, { type: TType }>;
}
