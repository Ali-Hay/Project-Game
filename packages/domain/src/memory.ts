import type { CampaignMemoryArtifacts, CopilotContextPack, MemoryBudget, MemoryFact } from "./types";
import type { LedgerEvent } from "./events";
import { createEventId } from "./events";

export const DEFAULT_MEMORY_BUDGET: MemoryBudget = {
  recencyEvents: 8,
  factLimit: 6,
  summaryCharacters: 320
};

function shortText(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, maxChars - 3)}...`;
}

export function deriveFactsFromEvents(events: LedgerEvent[]): MemoryFact[] {
  const facts: MemoryFact[] = [];

  for (const event of events) {
    if (event.type === "transcript.turn.created") {
      facts.push({
        id: createEventId("fact"),
        subject: event.payload.turn.speaker,
        predicate: "said",
        object: shortText(event.payload.turn.text, 120),
        confidence: 0.6,
        sourceEventId: event.id
      });
    }

    if (event.type === "token.move") {
      facts.push({
        id: createEventId("fact"),
        subject: event.payload.tokenId,
        predicate: "moved-to",
        object: `${event.payload.x},${event.payload.y}`,
        confidence: 0.9,
        sourceEventId: event.id
      });
    }

    if (event.type === "world.tick.started" && event.payload.worldEvent) {
      facts.push({
        id: createEventId("fact"),
        subject: "world",
        predicate: "changed",
        object: event.payload.worldEvent.summary,
        confidence: 0.8,
        sourceEventId: event.id
      });
    }
  }

  return facts;
}

export function buildKnowledgeGraph(facts: MemoryFact[]): Record<string, string[]> {
  return facts.reduce<Record<string, string[]>>((graph, fact) => {
    graph[fact.subject] ??= [];
    graph[fact.subject].push(`${fact.predicate}:${fact.object}`);
    return graph;
  }, {});
}

export function compactSummary(events: LedgerEvent[], budget = DEFAULT_MEMORY_BUDGET.summaryCharacters): string {
  const lines = events
    .slice(-DEFAULT_MEMORY_BUDGET.recencyEvents)
    .map((event) => {
      switch (event.type) {
        case "room.join":
          return `${event.payload.actorId} joined the room.`;
        case "dice.roll":
          return `${event.payload.actorId} rolled ${event.payload.total} for ${event.payload.label}.`;
        case "combat.start":
          return `Combat started with ${event.payload.initiativeOrder.length} combatants.`;
        case "combat.advance":
          return `Combat advanced to round ${event.payload.round}.`;
        case "transcript.turn.created":
          return `${event.payload.turn.speaker}: ${event.payload.turn.text}`;
        case "world.tick.started":
          return event.payload.worldEvent?.summary ?? "The world clock advanced.";
        case "recap.updated":
          return event.payload.recap;
        default:
          return `${event.type} processed.`;
      }
    })
    .join(" ");

  return shortText(lines, budget);
}

export function buildMemoryArtifacts(events: LedgerEvent[]): CampaignMemoryArtifacts {
  const facts = deriveFactsFromEvents(events);
  return {
    facts,
    graph: buildKnowledgeGraph(facts),
    summary: compactSummary(events)
  };
}

export function assembleContextPack(
  events: LedgerEvent[],
  facts: MemoryFact[],
  budgets: MemoryBudget = DEFAULT_MEMORY_BUDGET
): CopilotContextPack {
  const graph = buildKnowledgeGraph(facts.slice(-budgets.factLimit));

  return {
    recap: compactSummary(events, budgets.summaryCharacters),
    recentEvents: events
      .slice(-budgets.recencyEvents)
      .map((event) => `${event.type}@${event.occurredAt}`),
    memoryFacts: facts.slice(-budgets.factLimit),
    graph,
    budgets
  };
}
