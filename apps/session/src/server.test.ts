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

  it("requests, deduplicates, and executes approval-backed world tick intents", async () => {
    const server = await buildServer();
    servers.push(server);

    const requestPayload = {
      commandId: "cmd_request_ai_one",
      type: "ai.intent.request",
      intentId: "intent_world_tick",
      intentType: "world.tick.apply",
      title: "Advance the front pressure clock",
      detail: "Between sessions, advance one front based on the last recap and outstanding stakes."
    };

    const firstRequest = await server.app.inject({
      method: "POST",
      url: "/rooms/room_demo/commands",
      payload: requestPayload
    });

    expect(firstRequest.statusCode).toBe(200);

    const secondRequest = await server.app.inject({
      method: "POST",
      url: "/rooms/room_demo/commands",
      payload: {
        ...requestPayload,
        commandId: "cmd_request_ai_two"
      }
    });

    expect(secondRequest.statusCode).toBe(200);
    expect(secondRequest.json().events).toHaveLength(0);

    const requestedState = (
      await server.app.inject({
        method: "GET",
        url: "/rooms/room_demo/state"
      })
    ).json().state;

    expect(requestedState.approvals.filter((approval: { status: string }) => approval.status === "pending")).toHaveLength(1);

    const approvalId = requestedState.approvals[0].id;

    const approvalResponse = await server.app.inject({
      method: "POST",
      url: "/rooms/room_demo/commands",
      payload: {
        commandId: "cmd_approve_ai",
        type: "ai.intent.approve",
        approvalId
      }
    });

    expect(approvalResponse.statusCode).toBe(200);
    expect(approvalResponse.json().state.worldClock.tick).toBe(2);
    expect(approvalResponse.json().state.inbox[0].title).toBe("World tick 2");

    await new Promise((resolve) => setTimeout(resolve, 25));

    const approvedStateResponse = await server.app.inject({
      method: "GET",
      url: "/rooms/room_demo/state"
    });

    const approvedState = approvedStateResponse.json().state;
    const approvedGate = approvedState.approvals.find((approval: { id: string }) => approval.id === approvalId);

    expect(approvedGate.status).toBe("approved");
    expect(approvedGate.resolvedAt).toBeTruthy();
    expect(approvedState.worldClock.tick).toBe(2);
    expect(approvedState.memoryFacts.length).toBeGreaterThan(0);
  });

  it("returns 400 when approval commands target unknown approvals", async () => {
    const server = await buildServer();
    servers.push(server);

    const response = await server.app.inject({
      method: "POST",
      url: "/rooms/room_demo/commands",
      payload: {
        commandId: "cmd_missing_approval",
        type: "ai.intent.approve",
        approvalId: "approval_missing"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain("Unknown approval");
  });

  it("returns 400 when approval requests target unsupported intent types", async () => {
    const server = await buildServer();
    servers.push(server);

    const response = await server.app.inject({
      method: "POST",
      url: "/rooms/room_demo/commands",
      payload: {
        commandId: "cmd_unsupported_intent_request",
        type: "ai.intent.request",
        intentId: "intent_npc_attitude",
        intentType: "npc.attitude.change",
        title: "Escalate goblin morale",
        detail: "The goblin skirmisher should become openly hostile after the last exchange."
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for unknown campaign routes instead of leaking 500s", async () => {
    const server = await buildServer();
    servers.push(server);

    const [worldTick, copilot, voice] = await Promise.all([
      server.app.inject({
        method: "POST",
        url: "/campaigns/missing/world-tick",
        payload: {}
      }),
      server.app.inject({
        method: "POST",
        url: "/campaigns/missing/copilot",
        payload: {}
      }),
      server.app.inject({
        method: "GET",
        url: "/campaigns/missing/voice-token"
      })
    ]);

    expect(worldTick.statusCode).toBe(400);
    expect(copilot.statusCode).toBe(400);
    expect(voice.statusCode).toBe(400);
  });

  it("returns a friendly API root response", async () => {
    const server = await buildServer();
    servers.push(server);

    const response = await server.app.inject({
      method: "GET",
      url: "/"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "project-game-session",
      health: "/health"
    });
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
