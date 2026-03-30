import {
  assembleContextPack,
  intentRequiresApproval,
  type AIIntent,
  type LedgerEvent,
  type SessionRoomState
} from "@project-game/domain";

export interface CopilotResponse {
  context: ReturnType<typeof assembleContextPack>;
  messages: string[];
  suggestedIntents: Array<AIIntent & { requiresApproval: boolean }>;
}

export class CopilotService {
  buildResponse(room: SessionRoomState, ledger: LedgerEvent[]): CopilotResponse {
    const context = assembleContextPack(ledger, room.memoryFacts);
    const messages = [
      room.encounter
        ? `Round ${room.encounter.round} is active. ${room.encounter.initiativeOrder.length} tokens are in initiative.`
        : "No encounter is active. The table is currently in exploration mode.",
      room.diagnostics.transcript !== "healthy"
        ? "Transcript ingestion is degraded. The DM can continue manually and the table will stay live."
        : "Transcript ingestion is healthy."
    ];

    const intents: AIIntent[] = [
      {
        id: "intent_recap_banner",
        type: "surface.banner",
        title: "Degraded transcript banner",
        detail: "Show a clear banner that transcript capture is delayed while keeping the session live.",
        suggestedBy: "copilot"
      },
      {
        id: "intent_world_tick",
        type: "world.tick.apply",
        title: "Advance the front pressure clock",
        detail: "Between sessions, advance one front based on the last recap and outstanding stakes.",
        suggestedBy: "copilot"
      }
    ];

    return {
      context,
      messages,
      suggestedIntents: intents.map((intent) => ({
        ...intent,
        requiresApproval: intentRequiresApproval(intent.type)
      }))
    };
  }
}
