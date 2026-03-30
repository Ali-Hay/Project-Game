import {
  buildLedgerEvent,
  buildMemoryArtifacts,
  compactSummary,
  deriveFactsFromEvents,
  type LedgerEvent,
  type SessionRoomState
} from "@project-game/domain";

export class MemoryService {
  deriveWorkerEvents(room: SessionRoomState, ledger: LedgerEvent[], sourceEvents: LedgerEvent[]): LedgerEvent[] {
    const facts = deriveFactsFromEvents(sourceEvents).filter(
      (fact) => !room.memoryFacts.some((existing) => existing.sourceEventId === fact.sourceEventId && existing.object === fact.object)
    );

    const factEvents = facts.map((fact) => buildLedgerEvent(room.campaign, "memory.fact.created", { fact }));
    const summarySource = [...ledger, ...factEvents];
    const recap = compactSummary(summarySource);

    const recapEvent = buildLedgerEvent(room.campaign, "recap.updated", { recap });

    return [...factEvents, recapEvent];
  }

  snapshot(room: SessionRoomState, ledger: LedgerEvent[]) {
    const artifacts = buildMemoryArtifacts(ledger);
    return {
      summary: artifacts.summary,
      factCount: artifacts.facts.length,
      graphNodes: Object.keys(artifacts.graph).length
    };
  }
}
