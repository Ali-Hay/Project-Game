import { describe, expect, it } from "vitest";

import { applySessionCommand, createDemoCampaignState } from "../reducers/session-reducer";

describe("session reducer", () => {
  it("moves a token and keeps the command idempotent", () => {
    const state = createDemoCampaignState();
    const command = {
      commandId: "cmd_move",
      type: "token.move" as const,
      tokenId: "token_fighter",
      x: 7,
      y: 9
    };

    const firstPass = applySessionCommand(state, command);
    const secondPass = applySessionCommand(firstPass.state, command);

    expect(firstPass.state.tokens.token_fighter.x).toBe(7);
    expect(firstPass.events).toHaveLength(1);
    expect(secondPass.events).toHaveLength(0);
  });

  it("starts combat and advances initiative", () => {
    const state = createDemoCampaignState();
    const started = applySessionCommand(state, {
      commandId: "cmd_start",
      type: "combat.start"
    });

    const advanced = applySessionCommand(started.state, {
      commandId: "cmd_next",
      type: "combat.advance"
    });

    expect(started.state.encounter?.initiativeOrder.length).toBeGreaterThan(0);
    expect(advanced.state.encounter?.turnIndex).toBe(1);
  });
});
