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
});
