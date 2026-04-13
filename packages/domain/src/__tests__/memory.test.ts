import { describe, expect, it } from "vitest";

import { assembleContextPack, buildLedgerEvent, buildMemoryArtifacts, createTranscriptTurn } from "../index";
import { createTestSessionState } from "./fixtures";

describe("memory pipeline", () => {
  it("derives facts and compacts a recap from ledger events", () => {
    const state = createTestSessionState();
    const events = [
      buildLedgerEvent(state.campaign, "transcript.turn.created", {
        turn: createTranscriptTurn("Mira Vale", "player", "I charge across the rubble and pin the goblin in place.")
      }),
      buildLedgerEvent(state.campaign, "token.move", {
        tokenId: "token_fighter",
        x: 7,
        y: 4
      })
    ];

    const artifacts = buildMemoryArtifacts(events);
    const context = assembleContextPack(events, artifacts.facts);

    expect(artifacts.facts).toHaveLength(2);
    expect(context.recap).toContain("Mira Vale");
    expect(Object.keys(context.graph)).toContain("Mira Vale");
  });
});
