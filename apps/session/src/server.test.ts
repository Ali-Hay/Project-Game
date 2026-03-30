import { afterEach, describe, expect, it } from "vitest";

import { buildServer } from "./server";

const servers: Array<Awaited<ReturnType<typeof buildServer>>> = [];

afterEach(async () => {
  while (servers.length > 0) {
    const current = servers.pop();
    if (current) {
      await current.app.close();
    }
  }
});

describe("session server", () => {
  it("processes commands and derives memory from transcript events", async () => {
    const server = await buildServer();
    servers.push(server);

    const moveResponse = await server.app.inject({
      method: "POST",
      url: "/rooms/room_demo/commands",
      payload: {
        commandId: "cmd_move_test",
        type: "token.move",
        tokenId: "token_fighter",
        x: 6,
        y: 4
      }
    });

    expect(moveResponse.statusCode).toBe(200);

    const transcriptResponse = await server.app.inject({
      method: "POST",
      url: "/campaigns/campaign_demo/transcript-turns",
      payload: {
        speaker: "Dungeon Master",
        speakerRole: "gm",
        text: "The gate trembles and the rebel lanterns answer from the ridge."
      }
    });

    expect(transcriptResponse.statusCode).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 25));

    const stateResponse = await server.app.inject({
      method: "GET",
      url: "/rooms/room_demo/state"
    });

    const payload = stateResponse.json();

    expect(payload.state.tokens.token_fighter.x).toBe(6);
    expect(payload.state.memoryFacts.length).toBeGreaterThan(0);
    expect(payload.context.recap).toContain("Dungeon Master");
  });

  it("rejects unknown tokens instead of polluting ledger-derived memory", async () => {
    const server = await buildServer();
    servers.push(server);

    const response = await server.app.inject({
      method: "POST",
      url: "/rooms/room_demo/commands",
      payload: {
        commandId: "cmd_invalid_token",
        type: "token.move",
        tokenId: "token_missing",
        x: 99,
        y: 99
      }
    });

    expect(response.statusCode).toBe(400);

    const stateResponse = await server.app.inject({
      method: "GET",
      url: "/rooms/room_demo/state"
    });

    const payload = stateResponse.json();
    expect(payload.state.memoryFacts).toHaveLength(0);
    expect(payload.state.lastRecap).not.toContain("token_missing");
  });

  it("deduplicates repeated command ids at the service layer", async () => {
    const server = await buildServer();
    servers.push(server);

    const payload = {
      commandId: "cmd_duplicate",
      type: "token.move",
      tokenId: "token_fighter",
      x: 6,
      y: 5
    };

    await server.app.inject({
      method: "POST",
      url: "/rooms/room_demo/commands",
      payload
    });

    await server.app.inject({
      method: "POST",
      url: "/rooms/room_demo/commands",
      payload
    });

    await new Promise((resolve) => setTimeout(resolve, 25));

    const stateResponse = await server.app.inject({
      method: "GET",
      url: "/rooms/room_demo/state"
    });

    const state = stateResponse.json().state;
    expect(state.processedCommandIds).toContain("cmd_duplicate");
    expect(state.memoryFacts).toHaveLength(1);
  });
});
