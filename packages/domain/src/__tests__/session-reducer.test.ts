import { describe, expect, it } from "vitest";

import { applySessionCommand } from "../reducers/session-reducer";
import { createTestSessionState } from "./fixtures";

describe("session reducer", () => {
  it("moves a token and keeps the command idempotent", () => {
    const state = createTestSessionState();
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
    const state = createTestSessionState();
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

  it("deduplicates pending ai intent approvals by linked intent", () => {
    const state = createTestSessionState();
    const firstRequest = applySessionCommand(state, {
      commandId: "cmd_request_one",
      type: "ai.intent.request",
      intentId: "intent_world_tick",
      intentType: "world.tick.apply",
      title: "Advance the front pressure clock",
      detail: "Between sessions, advance one front based on the last recap and outstanding stakes."
    });

    const duplicateRequest = applySessionCommand(firstRequest.state, {
      commandId: "cmd_request_two",
      type: "ai.intent.request",
      intentId: "intent_world_tick",
      intentType: "world.tick.apply",
      title: "Advance the front pressure clock",
      detail: "Between sessions, advance one front based on the last recap and outstanding stakes."
    });

    expect(firstRequest.state.approvals).toHaveLength(1);
    expect(firstRequest.events).toHaveLength(1);
    expect(duplicateRequest.state.approvals).toHaveLength(1);
    expect(duplicateRequest.events).toHaveLength(0);
  });

  it("records approval resolution timestamps", () => {
    const state = createTestSessionState();
    const requested = applySessionCommand(state, {
      commandId: "cmd_request",
      type: "ai.intent.request",
      intentId: "intent_world_tick",
      intentType: "world.tick.apply",
      title: "Advance the front pressure clock",
      detail: "Between sessions, advance one front based on the last recap and outstanding stakes."
    });

    const approvalId = requested.state.approvals[0]?.id;
    expect(approvalId).toBeTruthy();

    const approved = applySessionCommand(requested.state, {
      commandId: "cmd_approve",
      type: "ai.intent.approve",
      approvalId: approvalId!
    });

    expect(approved.state.approvals[0]?.status).toBe("approved");
    expect(approved.state.approvals[0]?.resolvedAt).toBeTruthy();
  });
});
