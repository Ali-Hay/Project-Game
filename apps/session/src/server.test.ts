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

  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;
  delete process.env.VOICE_PROVIDER;
  delete process.env.LIVEKIT_API_KEY;
  delete process.env.LIVEKIT_API_SECRET;
  delete process.env.LIVEKIT_WS_URL;
  delete process.env.AI_PROVIDER;
  delete process.env.OPENAI_API_KEY;
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

  it("broadcasts transcript updates to websocket subscribers", async () => {
    const server = await buildServer();
    servers.push(server);

    await server.app.ready();
    const ws = await server.app.injectWS("/rooms/room_demo/ws");

    const stateUpdated = new Promise<string>((resolve) => {
      ws.on("message", (chunk: { toString(): string }) => {
        const payload = JSON.parse(chunk.toString());
        if (payload.type === "state.updated" && payload.state?.transcript?.length > 0) {
          resolve(payload.state.transcript[payload.state.transcript.length - 1].text);
        }
      });
    });

    const transcriptResponse = await server.app.inject({
      method: "POST",
      url: "/campaigns/campaign_demo/transcript-turns",
      payload: {
        speaker: "Dungeon Master",
        speakerRole: "gm",
        text: "The parapet rattles as the defenders raise their shields."
      }
    });

    expect(transcriptResponse.statusCode).toBe(200);
    await expect(stateUpdated).resolves.toContain("The parapet rattles");
    ws.terminate();
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

  it("reports scaffold runtime capabilities in health output", async () => {
    const server = await buildServer();
    servers.push(server);

    const response = await server.app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.runtime.storage.mode).toBe("in-memory");
    expect(payload.runtime.storage.durable).toBe(false);
    expect(payload.runtime.queue.mode).toBe("in-process");
    expect(payload.runtime.ai.mode).toBe("mock");
    expect(payload.runtime.voice.mode).toBe("mock");
    expect(payload.runtime.warnings).toEqual([]);
  });

  it("surfaces configured-but-unimplemented runtime integrations in health output", async () => {
    process.env.DATABASE_URL = "postgres://project_game:project_game@localhost:5432/project_game";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.VOICE_PROVIDER = "livekit";
    process.env.LIVEKIT_API_KEY = "key";
    process.env.LIVEKIT_API_SECRET = "secret";
    process.env.LIVEKIT_WS_URL = "wss://example.livekit.test";
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-key";

    const server = await buildServer();
    servers.push(server);

    const response = await server.app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.runtime.storage.mode).toBe("in-memory");
    expect(payload.runtime.queue.mode).toBe("in-process");
    expect(payload.runtime.voice.provider).toBe("livekit");
    expect(payload.runtime.voice.mode).toBe("needs-config");
    expect(payload.runtime.ai.provider).toBe("openai");
    expect(payload.runtime.ai.mode).toBe("needs-config");
    expect(payload.runtime.warnings).toContain(
      "DATABASE_URL is configured, but the session service still boots the in-memory RoomStore."
    );
    expect(payload.runtime.warnings).toContain(
      "REDIS_URL is configured, but the outbox still runs on an in-process queue."
    );
    expect(payload.runtime.warnings).toContain(
      "LiveKit transport settings are present, but signed access token issuance is not implemented in this scaffold yet."
    );
    expect(payload.runtime.warnings).toContain(
      "OpenAI was selected, but the scaffold still uses a deterministic local copilot response path."
    );
  });
});
