import type { VoiceDescriptor } from "@project-game/domain";

import type { SessionConfig } from "../config";

export interface VoiceProviderStatus {
  provider: string;
  mode: "ready" | "mock" | "needs-config";
  note: string;
}

export class VoiceProvider {
  constructor(private readonly config: SessionConfig) {}

  getStatus(): VoiceProviderStatus {
    if (this.config.VOICE_PROVIDER === "livekit") {
      if (!this.config.LIVEKIT_API_KEY || !this.config.LIVEKIT_API_SECRET || !this.config.LIVEKIT_WS_URL) {
        return {
          provider: "livekit",
          mode: "needs-config",
          note: "LiveKit is selected but credentials are missing. Falling back to degraded voice UX."
        };
      }

      return {
        provider: "livekit",
        mode: "needs-config",
        note: "LiveKit transport settings are present, but signed access token issuance is not implemented in this scaffold yet."
      };
    }

    return {
      provider: "mock",
      mode: "mock",
      note: "Using the mock voice provider. The UI can still exercise graceful degradation and status flows."
    };
  }

  issueDescriptor(campaignId: string, actorId: string): VoiceDescriptor {
    const status = this.getStatus();

    if (status.provider === "livekit") {
      return {
        provider: "livekit",
        roomName: `project-game-${campaignId}`,
        token: status.mode === "ready" ? `livekit-token-for-${actorId}` : "",
        status: status.mode,
        note: status.note
      };
    }

    return {
      provider: "mock",
      roomName: `project-game-${campaignId}`,
      token: `mock-${actorId}`,
      status: status.mode,
      note: status.note
    };
  }
}
