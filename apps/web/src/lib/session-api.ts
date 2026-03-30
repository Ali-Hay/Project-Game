import type { CampaignSummary, CopilotContextPack, SessionRoomState } from "@project-game/domain";

export interface RoomStateResponse {
  state: SessionRoomState;
  context: CopilotContextPack;
}

export interface CopilotResponse {
  context: CopilotContextPack;
  messages: string[];
  suggestedIntents: Array<{
    id: string;
    type: string;
    title: string;
    detail: string;
    requiresApproval: boolean;
  }>;
}

export interface VoiceDescriptor {
  provider: string;
  roomName: string;
  token: string;
  status: "ready" | "mock" | "needs-config";
  note: string;
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
  const response = await fetch(`${getSessionApiBaseUrl()}/campaigns`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch campaigns");
  }

  return response.json();
}

export async function fetchRoomState(roomId: string): Promise<RoomStateResponse> {
  const response = await fetch(`${getSessionApiBaseUrl()}/rooms/${roomId}/state`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch room state");
  }

  return response.json();
}
