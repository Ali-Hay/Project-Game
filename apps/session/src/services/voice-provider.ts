import type { SessionConfig } from "../config";

export interface VoiceDescriptor {
  provider: string;
  roomName: string;
  token: string;
  status: "ready" | "mock" | "needs-config";
  note: string;
}

export class VoiceProvider {
  constructor(private readonly config: SessionConfig) {}

  issueDescriptor(campaignId: string, actorId: string): VoiceDescriptor {
    if (this.config.VOICE_PROVIDER === "livekit") {
      if (!this.config.LIVEKIT_API_KEY || !this.config.LIVEKIT_API_SECRET || !this.config.LIVEKIT_WS_URL) {
        return {
          provider: "livekit",
          roomName: `project-game-${campaignId}`,
          token: "",
          status: "needs-config",
          note: "LiveKit is selected but credentials are missing. Falling back to degraded voice UX."
        };
      }

      return {
        provider: "livekit",
        roomName: `project-game-${campaignId}`,
        token: `configure-token-issuer-for-${actorId}`,
        status: "ready",
        note: "Voice transport is configured. Replace the placeholder token issuer with a signed access token endpoint."
      };
    }

    return {
      provider: "mock",
      roomName: `project-game-${campaignId}`,
      token: `mock-${actorId}`,
      status: "mock",
      note: "Using the mock voice provider. The UI can still exercise graceful degradation and status flows."
    };
  }
}
