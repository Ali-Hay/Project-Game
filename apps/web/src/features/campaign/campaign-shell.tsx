"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { CopilotContextPack, SessionRoomState, Token } from "@project-game/domain";

import { CopilotPanel } from "../copilot/copilot-panel";
import { TabletopBoard } from "../tabletop/tabletop-board";
import { getSessionApiBaseUrl, getSessionWebSocketUrl, type CopilotResponse, type VoiceDescriptor } from "../../lib/session-api";

interface CampaignShellProps {
  roomId: string;
  initialState: SessionRoomState;
  initialContext: CopilotContextPack;
}

export function CampaignShell({ roomId, initialState, initialContext }: CampaignShellProps) {
  const [state, setState] = useState(initialState);
  const [context, setContext] = useState(initialContext);
  const [copilot, setCopilot] = useState<CopilotResponse | null>(null);
  const [voice, setVoice] = useState<VoiceDescriptor | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const socket = new WebSocket(getSessionWebSocketUrl(roomId));

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.state) {
        setState(payload.state);
      }
      if (payload.context) {
        setContext(payload.context);
      }
    });

    return () => {
      socket.close();
    };
  }, [roomId]);

  const degradedServices = useMemo(
    () =>
      Object.entries(state.diagnostics)
        .filter(([, status]) => status !== "healthy")
        .map(([service, status]) => `${service} is ${status}`),
    [state.diagnostics]
  );

  const postJson = async <T,>(path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${getSessionApiBaseUrl()}${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${path}`);
    }

    return response.json();
  };

  const issueCommand = async (command: Record<string, unknown>) => {
    const payload = await postJson<{ state: SessionRoomState; context?: CopilotContextPack }>(`/rooms/${roomId}/commands`, command);
    setState(payload.state);
  };

  const nudgeToken = (tokenId: string, dx: number, dy: number) => {
    const token = state.tokens[tokenId];
    if (!token) return;

    startTransition(() => {
      void issueCommand({
        commandId: crypto.randomUUID(),
        type: "token.move",
        tokenId,
        x: Math.max(0, Math.min(9, token.x + dx)),
        y: Math.max(0, Math.min(9, token.y + dy))
      });
    });
  };

  const rollCheck = (actorId: string, label: string) => {
    startTransition(() => {
      void issueCommand({
        commandId: crypto.randomUUID(),
        type: "dice.roll",
        actorId,
        label,
        count: 1,
        sides: 20,
        modifier: 0
      });
    });
  };

  const startCombat = () => {
    startTransition(() => {
      void issueCommand({
        commandId: crypto.randomUUID(),
        type: "combat.start"
      });
    });
  };

  const advanceCombat = () => {
    startTransition(() => {
      void issueCommand({
        commandId: crypto.randomUUID(),
        type: "combat.advance"
      });
    });
  };

  const injectTranscript = () => {
    startTransition(() => {
      void postJson(`/campaigns/${state.campaign.id}/transcript-turns`, {
        speaker: "Dungeon Master",
        speakerRole: "gm",
        text: "The enemy standard dips as the rain lashes harder across the shattered parapet."
      });
    });
  };

  const advanceWorldTick = () => {
    startTransition(() => {
      void postJson(`/campaigns/${state.campaign.id}/world-tick`, {});
    });
  };

  const toggleTranscriptHealth = () => {
    startTransition(() => {
      void postJson(`/campaigns/${state.campaign.id}/diagnostics/transcript`, {
        status: state.diagnostics.transcript === "healthy" ? "degraded" : "healthy"
      });
    });
  };

  const refreshCopilot = () => {
    startTransition(() => {
      void postJson<CopilotResponse>(`/campaigns/${state.campaign.id}/copilot`, {}).then(setCopilot);
    });
  };

  const loadVoice = () => {
    startTransition(() => {
      void postJson<VoiceDescriptor>(
        `/campaigns/${state.campaign.id}/voice-token?actorId=actor_gm`
      ).then(setVoice);
    });
  };

  const tokens = Object.values(state.tokens).sort((left, right) => left.label.localeCompare(right.label));

  return (
    <div className="campaign-shell">
      <section className="hero-shell">
        <div>
          <p className="eyebrow">Project Game</p>
          <h1>{state.campaign.name}</h1>
          <p className="hero-copy">{state.scene.description}</p>
        </div>
        <div className="hero-meta">
          <span>Scene: {state.scene.name}</span>
          <span>World day {state.worldClock.currentDay}</span>
          <span>{isPending ? "Syncing..." : "Live"}</span>
        </div>
      </section>

      {degradedServices.length > 0 ? (
        <div className="status-banner">
          <strong>Graceful degradation active.</strong> {degradedServices.join(", ")}. The table remains playable.
        </div>
      ) : null}

      <div className="campaign-grid">
        <TabletopBoard
          tokens={tokens}
          encounter={state.encounter}
          onNudgeToken={nudgeToken}
          onRoll={rollCheck}
          onStartCombat={startCombat}
          onAdvanceCombat={advanceCombat}
        />

        <CopilotPanel
          recap={state.lastRecap}
          context={context}
          diagnostics={state.diagnostics}
          approvals={state.approvals}
          copilot={copilot}
          voice={voice}
          onRefreshCopilot={refreshCopilot}
          onInjectTranscript={injectTranscript}
          onAdvanceWorldTick={advanceWorldTick}
          onToggleTranscriptHealth={toggleTranscriptHealth}
          onLoadVoice={loadVoice}
        />
      </div>

      <div className="campaign-grid campaign-grid-secondary">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Living World</p>
              <h2>Factions and fronts</h2>
            </div>
          </div>
          <div className="info-grid">
            {state.factions.map((faction) => (
              <article className="info-card" key={faction.id}>
                <h3>{faction.name}</h3>
                <p>Pressure: {faction.pressure}</p>
              </article>
            ))}
            {state.fronts.map((front) => (
              <article className="info-card" key={front.id}>
                <h3>{front.name}</h3>
                <p>Progress: {front.progress}</p>
                <p>{front.stakes}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Between Sessions</p>
              <h2>Inbox and aftermath</h2>
            </div>
          </div>
          <div className="info-grid">
            {state.inbox.length > 0 ? (
              state.inbox.map((message) => (
                <article className="info-card" key={message.id}>
                  <h3>{message.title}</h3>
                  <p>{message.body}</p>
                </article>
              ))
            ) : (
              <article className="info-card">
                <h3>No async updates yet</h3>
                <p>Advance the world tick to create inbox-style campaign fallout.</p>
              </article>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
