import type {
  CampaignSummary,
  CopilotContextPack,
  CopilotResponse,
  ServiceHealth,
  SessionCommand,
  SessionRoomState,
  SuggestedIntent,
  TranscriptTurnRequest,
  VoiceDescriptor
} from "@project-game/domain";

export interface SessionMutationResponse {
  roomId?: string;
  state: SessionRoomState;
  context?: CopilotContextPack;
}

export interface RoomStateResponse extends SessionMutationResponse {
  context: CopilotContextPack;
}

function getErrorMessage(path: string, response: Response, fallback: string) {
  return response
    .json()
    .then((payload: { error?: string }) => payload.error ?? fallback)
    .catch(() => fallback)
    .then((message) => `${message} (${path}, ${response.status})`);
}

async function fetchSessionJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getSessionApiBaseUrl()}${path}`, {
    cache: "no-store",
    ...init
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(path, response, "Session request failed"));
  }

  return response.json();
}

export function getSessionApiBaseUrl() {
  return process.env.NEXT_PUBLIC_SESSION_API_URL ?? "http://localhost:4000";
}

export function getSessionWebSocketUrl(roomId: string) {
  const baseUrl = getSessionApiBaseUrl();
  const wsUrl = baseUrl.startsWith("https://")
    ? baseUrl.replace("https://", "wss://")
    : baseUrl.replace("http://", "ws://");

  return `${wsUrl}/rooms/${roomId}/ws`;
}

export async function fetchCampaigns(): Promise<CampaignSummary[]> {
  return fetchSessionJson<CampaignSummary[]>("/campaigns");
}

export async function fetchRoomState(roomId: string): Promise<RoomStateResponse> {
  return fetchSessionJson<RoomStateResponse>(`/rooms/${roomId}/state`);
}

export async function issueRoomCommand(roomId: string, command: SessionCommand): Promise<SessionMutationResponse> {
  return fetchSessionJson<SessionMutationResponse>(`/rooms/${roomId}/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
}

export async function requestAiIntentApproval(roomId: string, intent: SuggestedIntent): Promise<SessionMutationResponse> {
  if (intent.type !== "world.tick.apply") {
    throw new Error(`Unsupported approval intent: ${intent.type}`);
  }

  return issueRoomCommand(roomId, {
    commandId: crypto.randomUUID(),
    type: "ai.intent.request",
    intentId: intent.id,
    intentType: "world.tick.apply",
    title: intent.title,
    detail: intent.detail
  });
}

export async function approveAiIntent(roomId: string, approvalId: string): Promise<SessionMutationResponse> {
  return issueRoomCommand(roomId, {
    commandId: crypto.randomUUID(),
    type: "ai.intent.approve",
    approvalId
  });
}

export async function rejectAiIntent(roomId: string, approvalId: string, reason?: string): Promise<SessionMutationResponse> {
  return issueRoomCommand(roomId, {
    commandId: crypto.randomUUID(),
    type: "ai.intent.reject",
    approvalId,
    reason
  });
}

export async function moveToken(roomId: string, tokenId: string, x: number, y: number): Promise<SessionMutationResponse> {
  return issueRoomCommand(roomId, {
    commandId: crypto.randomUUID(),
    type: "token.move",
    tokenId,
    x,
    y
  });
}

export async function rollDice(
  roomId: string,
  actorId: string,
  label: string,
  count: number,
  sides: number,
  modifier = 0
): Promise<SessionMutationResponse> {
  return issueRoomCommand(roomId, {
    commandId: crypto.randomUUID(),
    type: "dice.roll",
    actorId,
    label,
    count,
    sides,
    modifier
  });
}

export async function startCombat(roomId: string): Promise<SessionMutationResponse> {
  return issueRoomCommand(roomId, {
    commandId: crypto.randomUUID(),
    type: "combat.start"
  });
}

export async function advanceCombat(roomId: string): Promise<SessionMutationResponse> {
  return issueRoomCommand(roomId, {
    commandId: crypto.randomUUID(),
    type: "combat.advance"
  });
}

export async function createTranscriptTurn(campaignId: string, payload: TranscriptTurnRequest): Promise<SessionMutationResponse> {
  return fetchSessionJson<SessionMutationResponse>(`/campaigns/${campaignId}/transcript-turns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function advanceWorldTick(campaignId: string): Promise<SessionMutationResponse> {
  return fetchSessionJson<SessionMutationResponse>(`/campaigns/${campaignId}/world-tick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
}

export async function updateServiceHealth(
  campaignId: string,
  service: "voice" | "transcript" | "ai" | "memory",
  status: ServiceHealth
): Promise<SessionMutationResponse> {
  return fetchSessionJson<SessionMutationResponse>(`/campaigns/${campaignId}/diagnostics/${service}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
}

export async function fetchCopilot(campaignId: string): Promise<CopilotResponse> {
  return fetchSessionJson<CopilotResponse>(`/campaigns/${campaignId}/copilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
}

export async function fetchVoiceDescriptor(campaignId: string, actorId = "actor_gm"): Promise<VoiceDescriptor> {
  return fetchSessionJson<VoiceDescriptor>(`/campaigns/${campaignId}/voice-token?actorId=${actorId}`);
}
