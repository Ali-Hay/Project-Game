import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";

import { transcriptTurnRequestSchema } from "@project-game/domain";

import { readConfig } from "./config";
import { CopilotService } from "./services/copilot-service";
import { MemoryService } from "./services/memory-service";
import { OutboxService } from "./services/outbox-service";
import { buildRuntimeCapabilities } from "./services/runtime-capabilities";
import { VoiceProvider } from "./services/voice-provider";
import { RoomStore } from "./state/room-store";
import { WorldTickWorker } from "./workers/world-tick-worker";

type SocketLike = {
  readyState: number;
  send: (payload: string) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
};

function safeSend(socket: SocketLike, payload: unknown) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
}

export async function buildServer() {
  const config = readConfig();
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  const roomStore = new RoomStore();
  const memoryService = new MemoryService();
  const copilotService = new CopilotService();
  const voiceProvider = new VoiceProvider(config);
  const worldTickWorker = new WorldTickWorker(roomStore);
  const runtime = buildRuntimeCapabilities(config, voiceProvider.getStatus());

  const subscriptions = new Map<string, Set<SocketLike>>();

  const broadcast = (roomId: string, payload: unknown) => {
    const sockets = subscriptions.get(roomId);
    if (!sockets) return;
    for (const socket of sockets) {
      safeSend(socket, payload);
    }
  };

  const outbox = new OutboxService(async ({ roomId, sourceEvents }: { roomId: string; sourceEvents: unknown[] }) => {
    const room = roomStore.getRoom(roomId);
    const ledger = roomStore.getLedger(roomId);
    const derivedEvents = memoryService.deriveWorkerEvents(room, ledger, sourceEvents as typeof ledger);
    const state = roomStore.appendEvents(roomId, derivedEvents);

    broadcast(roomId, {
      type: "state.updated",
      state,
      derived: true,
      memory: memoryService.snapshot(state, roomStore.getLedger(roomId)),
      context: roomStore.getContext(state.campaign.id)
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    runtime,
    rooms: roomStore.listCampaigns().length,
    diagnostics: roomStore.listCampaigns().map((campaign) => ({
      id: campaign.campaign.id,
      diagnostics: campaign.diagnostics
    }))
  }));

  app.get("/campaigns", async () => roomStore.listCampaigns());

  app.get("/rooms/:roomId/state", async (request) => {
    const { roomId } = request.params as { roomId: string };
    return {
      state: roomStore.getRoom(roomId),
      context: roomStore.getContext(roomStore.getRoom(roomId).campaign.id)
    };
  });

  app.post("/rooms/:roomId/commands", async (request, reply) => {
    try {
      const { roomId } = request.params as { roomId: string };
      const result = roomStore.dispatchCommand(roomId, request.body);

      broadcast(roomId, {
        type: "state.updated",
        state: result.state,
        events: result.events,
        context: roomStore.getContext(result.state.campaign.id)
      });

      if (result.events.length > 0) {
        outbox.enqueue({ roomId, sourceEvents: result.events });
      }

      return result;
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Unknown command failure"
      });
    }
  });

  app.post("/campaigns/:campaignId/transcript-turns", async (request, reply) => {
    try {
      const { campaignId } = request.params as { campaignId: string };
      const payload = transcriptTurnRequestSchema.parse(request.body);
      const result = roomStore.createTranscriptEvent(campaignId, payload.speaker, payload.speakerRole, payload.text);
      outbox.enqueue({ roomId: result.roomId, sourceEvents: result.events });
      broadcast(result.roomId, {
        type: "state.updated",
        state: result.state,
        events: result.events,
        context: roomStore.getContext(campaignId)
      });
      return result;
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Transcript ingestion failed"
      });
    }
  });

  app.post("/campaigns/:campaignId/world-tick", async (request) => {
    const { campaignId } = request.params as { campaignId: string };
    const result = worldTickWorker.tick(campaignId);
    outbox.enqueue({ roomId: result.roomId, sourceEvents: result.events });
    broadcast(result.roomId, {
      type: "state.updated",
      state: result.state,
      events: result.events,
      context: roomStore.getContext(campaignId)
    });
    return result;
  });

  app.post("/campaigns/:campaignId/diagnostics/:service", async (request, reply) => {
    try {
      const { campaignId, service } = request.params as {
        campaignId: string;
        service: "voice" | "transcript" | "ai" | "memory";
      };
      const body = request.body as { status?: "healthy" | "degraded" | "offline" };
      const result = roomStore.updateServiceHealth(campaignId, service, body.status ?? "degraded");
      broadcast(result.roomId, {
        type: "state.updated",
        state: result.state,
        events: result.events,
        context: roomStore.getContext(campaignId)
      });
      return result;
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Unable to update diagnostics"
      });
    }
  });

  app.get("/campaigns/:campaignId/context", async (request) => {
    const { campaignId } = request.params as { campaignId: string };
    return roomStore.getContext(campaignId);
  });

  app.post("/campaigns/:campaignId/copilot", async (request) => {
    const { campaignId } = request.params as { campaignId: string };
    const room = roomStore.findRoomByCampaign(campaignId);
    return copilotService.buildResponse(room, roomStore.getLedger(room.roomId));
  });

  app.get("/campaigns/:campaignId/voice-token", async (request) => {
    const { campaignId } = request.params as { campaignId: string };
    const { actorId = "actor_gm" } = request.query as { actorId?: string };
    return voiceProvider.issueDescriptor(campaignId, actorId);
  });

  app.get("/rooms/:roomId/ws", { websocket: true }, (connection, request) => {
    const { roomId } = request.params as { roomId: string };
    const room = roomStore.getRoom(roomId);
    const roomSockets = subscriptions.get(roomId) ?? new Set<SocketLike>();
    roomSockets.add(connection.socket);
    subscriptions.set(roomId, roomSockets);

    safeSend(connection.socket, {
      type: "state.bootstrap",
      state: room,
      context: roomStore.getContext(room.campaign.id)
    });

    connection.socket.on("message", (message: any) => {
      safeSend(connection.socket, {
        type: "ws.echo",
        received: message.toString()
      });
    });

    connection.socket.on("close", () => {
      roomSockets.delete(connection.socket);
    });
  });

  return { app };
}
