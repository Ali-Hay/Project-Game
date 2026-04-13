"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import type { Actor, CopilotContextPack, CopilotResponse, ServiceHealth, SessionRoomState, SuggestedIntent, VoiceDescriptor } from "@project-game/domain";

import { ApprovalCard, type ApprovalActionState } from "../approvals/approval-card";
import { CopilotPanel } from "../copilot/copilot-panel";
import { TabletopBoard } from "../tabletop/tabletop-board";
import {
  advanceCombat as advanceCombatRequest,
  advanceWorldTick as advanceWorldTickRequest,
  approveAiIntent,
  createTranscriptTurn,
  fetchCopilot,
  fetchVoiceDescriptor,
  getSessionWebSocketUrl,
  moveToken,
  rejectAiIntent,
  requestAiIntentApproval,
  rollDice,
  startCombat as startCombatRequest,
  type SessionMutationResponse,
  updateServiceHealth
} from "../../lib/session-api";

interface CampaignShellProps {
  campaignId: string;
  roomId: string;
  initialState: SessionRoomState;
  initialContext: CopilotContextPack;
  mode: ShellMode;
}

type ShellMode = "live" | "hq" | "companion";
type CompanionSection = "sheet" | "dice" | "recap" | "quest";
type LiveRailTab = "transcript" | "pressure" | "approvals";
type ApprovalActionMap = Record<string, ApprovalActionState>;

const shellModes: Array<{ id: ShellMode; label: string; summary: string }> = [
  { id: "live", label: "Live Session", summary: "Map, transcript rail, and copilot approvals." },
  { id: "hq", label: "Campaign HQ", summary: "Between-session fallout, fronts, and inbox pressure." },
  { id: "companion", label: "Player Companion", summary: "Phone-first recap, dice, and character snapshots." }
];

const utcShortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC"
});

function getShellHref(campaignId: string, mode: ShellMode) {
  switch (mode) {
    case "hq":
      return `/campaigns/${campaignId}/hq`;
    case "companion":
      return `/campaigns/${campaignId}/companion`;
    case "live":
    default:
      return `/campaigns/${campaignId}`;
  }
}

function formatShortDate(value: string) {
  return `${utcShortDateFormatter.format(new Date(value))} UTC`;
}

function getHealthTone(status: ServiceHealth) {
  switch (status) {
    case "healthy":
      return "healthy";
    case "degraded":
      return "warning";
    case "offline":
      return "danger";
    default:
      return "neutral";
  }
}

function getSyncLabel(isPending: boolean) {
  return isPending ? "Syncing changes" : "Authoritative session live";
}

function getCampaignObjective(actors: Actor[]) {
  const nextPlayer = actors.find((actor) => actor.role === "player");

  if (!nextPlayer) {
    return "No player sheets have joined yet. Keep recap and approvals readable for late arrivals.";
  }

  return `${nextPlayer.name} is the current player anchor. Keep objective, recap, and rolls one tap away.`;
}

export function CampaignShell({ campaignId, roomId, initialState, initialContext, mode }: CampaignShellProps) {
  const [state, setState] = useState(initialState);
  const [context, setContext] = useState(initialContext);
  const [copilot, setCopilot] = useState<CopilotResponse | null>(null);
  const [voice, setVoice] = useState<VoiceDescriptor | null>(null);
  const [companionSection, setCompanionSection] = useState<CompanionSection>("sheet");
  const [liveRailTab, setLiveRailTab] = useState<LiveRailTab>("transcript");
  const [approvalActionState, setApprovalActionState] = useState<ApprovalActionMap>({});
  const [intentErrorState, setIntentErrorState] = useState<Record<string, string>>({});
  const [requestingIntentIds, setRequestingIntentIds] = useState<string[]>([]);
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
        .map(([service, status]) => ({ service, status })),
    [state.diagnostics]
  );

  const actorList = useMemo(() => Object.values(state.actors), [state.actors]);

  const tokens = useMemo(
    () => Object.values(state.tokens).sort((left, right) => left.label.localeCompare(right.label)),
    [state.tokens]
  );

  const pendingApprovals = useMemo(
    () => state.approvals.filter((approval) => approval.status === "pending"),
    [state.approvals]
  );

  const transcriptTurns = useMemo(() => state.transcript.slice(-6).reverse(), [state.transcript]);
  const catchUpTurns = useMemo(() => transcriptTurns.slice(0, 3), [transcriptTurns]);

  const activeFront = useMemo(
    () => [...state.fronts].sort((left, right) => right.progress - left.progress)[0] ?? null,
    [state.fronts]
  );

  const pressuredFactions = useMemo(
    () => [...state.factions].sort((left, right) => right.pressure - left.pressure).slice(0, 3),
    [state.factions]
  );

  const players = useMemo(() => actorList.filter((actor) => actor.role === "player"), [actorList]);
  const recentlyResolvedApprovals = useMemo(
    () =>
      state.approvals
        .filter((approval) => approval.status !== "pending")
        .sort((left, right) => {
          const leftTimestamp = left.resolvedAt ?? left.requestedAt;
          const rightTimestamp = right.resolvedAt ?? right.requestedAt;
          return rightTimestamp.localeCompare(leftTimestamp);
        })
        .slice(0, 3),
    [state.approvals]
  );

  const applyRoomMutation = (payload: SessionMutationResponse) => {
    setState(payload.state);
    if (payload.context) {
      setContext(payload.context);
    }
  };

  useEffect(() => {
    const pendingIntentIds = new Set(pendingApprovals.map((approval) => approval.linkedId));

    setRequestingIntentIds((current) => current.filter((intentId) => !pendingIntentIds.has(intentId)));
    setIntentErrorState((current) => {
      const next = { ...current };
      for (const intentId of pendingIntentIds) {
        delete next[intentId];
      }
      return next;
    });
    setApprovalActionState((current) => {
      const next = { ...current };

      for (const approvalId of Object.keys(next)) {
        const approval = state.approvals.find((entry) => entry.id === approvalId);
        if (!approval || approval.status !== "pending") {
          delete next[approvalId];
        }
      }

      return next;
    });
  }, [pendingApprovals, state.approvals]);

  const nudgeToken = (tokenId: string, dx: number, dy: number) => {
    const token = state.tokens[tokenId];
    if (!token) return;

    startTransition(() => {
      void moveToken(roomId, tokenId, Math.max(0, Math.min(9, token.x + dx)), Math.max(0, Math.min(9, token.y + dy))).then(applyRoomMutation);
    });
  };

  const rollCheck = (actorId: string, label: string) => {
    startTransition(() => {
      void rollDice(roomId, actorId, label, 1, 20).then(applyRoomMutation);
    });
  };

  const startCombat = () => {
    startTransition(() => {
      void startCombatRequest(roomId).then(applyRoomMutation);
    });
  };

  const advanceCombat = () => {
    startTransition(() => {
      void advanceCombatRequest(roomId).then(applyRoomMutation);
    });
  };

  const injectTranscript = () => {
    startTransition(() => {
      void createTranscriptTurn(state.campaign.id, {
        speaker: "Dungeon Master",
        speakerRole: "gm",
        text: "The enemy standard dips as the rain lashes harder across the shattered parapet."
      }).then(applyRoomMutation);
    });
  };

  const advanceWorldTick = () => {
    startTransition(() => {
      void advanceWorldTickRequest(state.campaign.id).then(applyRoomMutation);
    });
  };

  const toggleTranscriptHealth = () => {
    startTransition(() => {
      void updateServiceHealth(state.campaign.id, "transcript", state.diagnostics.transcript === "healthy" ? "degraded" : "healthy").then(
        applyRoomMutation
      );
    });
  };

  const refreshCopilot = () => {
    startTransition(() => {
      void fetchCopilot(state.campaign.id).then(setCopilot);
    });
  };

  const loadVoice = () => {
    startTransition(() => {
      void fetchVoiceDescriptor(state.campaign.id).then(setVoice);
    });
  };

  const requestApproval = (intent: SuggestedIntent) => {
    setRequestingIntentIds((current) => (current.includes(intent.id) ? current : [...current, intent.id]));
    setIntentErrorState((current) => {
      const next = { ...current };
      delete next[intent.id];
      return next;
    });

    startTransition(() => {
      void requestAiIntentApproval(roomId, intent)
        .then(applyRoomMutation)
        .catch((error: unknown) => {
          setRequestingIntentIds((current) => current.filter((intentId) => intentId !== intent.id));
          setIntentErrorState((current) => ({
            ...current,
            [intent.id]: error instanceof Error ? error.message : "Could not queue approval."
          }));
        });
    });
  };

  const approveApproval = (approvalId: string) => {
    setApprovalActionState((current) => ({
      ...current,
      [approvalId]: { phase: "approving" }
    }));

    startTransition(() => {
      void approveAiIntent(roomId, approvalId)
        .then(applyRoomMutation)
        .catch((error: unknown) => {
          setApprovalActionState((current) => ({
            ...current,
            [approvalId]: {
              phase: "failed",
              message: error instanceof Error ? error.message : "Could not apply this approval."
            }
          }));
        });
    });
  };

  const rejectApproval = (approvalId: string) => {
    setApprovalActionState((current) => ({
      ...current,
      [approvalId]: { phase: "rejecting" }
    }));

    startTransition(() => {
      void rejectAiIntent(roomId, approvalId)
        .then(applyRoomMutation)
        .catch((error: unknown) => {
          setApprovalActionState((current) => ({
            ...current,
            [approvalId]: {
              phase: "failed",
              message: error instanceof Error ? error.message : "Could not reject this approval."
            }
          }));
        });
    });
  };

  return (
    <div className={`campaign-shell desk-shell campaign-shell-${mode}`}>
      <header className="campaign-header">
        <div className="campaign-header-copy">
          <p className="eyebrow">Live Campaign Desk</p>
          <h1>{state.campaign.name}</h1>
          <p className="hero-copy">{state.scene.description}</p>
        </div>

        <section className="header-status-panel" aria-label="Campaign status">
          <div className="header-status-row">
            <span className={`status-chip status-chip-${isPending ? "info" : "healthy"}`}>{getSyncLabel(isPending)}</span>
            <span className="status-chip status-chip-neutral">World day {state.worldClock.currentDay}</span>
            <span className="status-chip status-chip-neutral">{pendingApprovals.length} approvals waiting</span>
          </div>

          <div className="header-status-grid">
            <article className="status-card">
              <p className="eyebrow">Current scene</p>
              <h2>{state.scene.name}</h2>
              <p>{state.map.name}</p>
            </article>

            <article className="status-card">
              <p className="eyebrow">Encounter posture</p>
              <h2>{state.encounter ? `Round ${state.encounter.round}` : "Exploration"}</h2>
              <p>{state.encounter ? `${state.encounter.initiativeOrder.length} combatants on the slate.` : "Initiative drawer is idle."}</p>
            </article>
          </div>
        </section>
      </header>

      <nav className="mode-tabs" aria-label="Product shells">
        {shellModes.map((shellMode) => (
          <Link
            className={`mode-tab ${mode === shellMode.id ? "mode-tab-active" : ""}`}
            href={getShellHref(campaignId, shellMode.id)}
            key={shellMode.id}
            prefetch={false}
          >
            <span>{shellMode.label}</span>
            <small>{shellMode.summary}</small>
          </Link>
        ))}
      </nav>

      <section className={`pressure-strip ${degradedServices.length > 0 ? "pressure-strip-alert" : ""}`} aria-label="Pressure strip">
        <article className="pressure-item">
          <p className="eyebrow">Front pressure</p>
          <strong>{activeFront ? `${activeFront.name} at ${activeFront.progress}` : "No front currently escalating"}</strong>
        </article>
        <article className="pressure-item">
          <p className="eyebrow">Approvals</p>
          <strong>{pendingApprovals.length > 0 ? `${pendingApprovals.length} canon changes blocked for DM review` : "Approval queue is clear"}</strong>
        </article>
        <article className="pressure-item">
          <p className="eyebrow">Services</p>
          <strong>
            {degradedServices.length > 0
              ? degradedServices.map(({ service, status }) => `${service} ${status}`).join(", ")
              : "Voice, transcript, AI, and memory are healthy"}
          </strong>
        </article>
      </section>

      {degradedServices.length > 0 ? (
        <section className="status-banner" aria-live="polite">
          <strong>Graceful degradation active.</strong> {degradedServices.map(({ service, status }) => `${service} is ${status}`).join(", ")}. The
          table remains playable while async systems recover.
        </section>
      ) : null}

      {mode === "live" ? (
        <section className="session-layout">
          <aside className="rail transcript-rail" aria-label="Transcript rail">
            <div className="live-rail-tabs" aria-label="Transcript rail sections">
              <button
                aria-pressed={liveRailTab === "transcript"}
                className={liveRailTab === "transcript" ? "live-rail-tab-active" : ""}
                onClick={() => setLiveRailTab("transcript")}
                type="button"
              >
                Transcript
              </button>
              <button
                aria-pressed={liveRailTab === "pressure"}
                className={liveRailTab === "pressure" ? "live-rail-tab-active" : ""}
                onClick={() => setLiveRailTab("pressure")}
                type="button"
              >
                Pressure
              </button>
              <button
                aria-pressed={liveRailTab === "approvals"}
                className={liveRailTab === "approvals" ? "live-rail-tab-active" : ""}
                onClick={() => setLiveRailTab("approvals")}
                type="button"
              >
                Approvals
              </button>
            </div>

            <div className={`rail-section live-rail-panel ${liveRailTab === "transcript" ? "live-rail-panel-active" : ""}`}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Transcript rail</p>
                  <h2>What just happened</h2>
                </div>
                <span className={`status-chip status-chip-${getHealthTone(state.diagnostics.transcript)}`}>
                  {state.diagnostics.transcript}
                </span>
              </div>

              <ul className="transcript-list">
                {transcriptTurns.length > 0 ? (
                  transcriptTurns.map((turn) => (
                    <li className="transcript-line" key={turn.id}>
                      <div className="transcript-meta">
                        <strong>{turn.speaker}</strong>
                        <time dateTime={turn.occurredAt}>{formatShortDate(turn.occurredAt)}</time>
                      </div>
                      <p>{turn.text}</p>
                    </li>
                  ))
                ) : (
                  <li className="transcript-empty">No transcript turns yet. Inject a turn or join voice to start the rail.</li>
                )}
              </ul>
            </div>

            <div className={`rail-section live-rail-panel ${liveRailTab === "pressure" ? "live-rail-panel-active" : ""}`}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">World pressure</p>
                  <h3>Factions to watch</h3>
                </div>
              </div>

              <div className="front-list">
                {pressuredFactions.map((faction) => (
                  <article className="front-card" key={faction.id}>
                    <div className="front-card-header">
                      <strong>{faction.name}</strong>
                      <span>{faction.pressure}</span>
                    </div>
                    <div className="meter">
                      <span style={{ width: `${Math.min(100, faction.pressure * 10)}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className={`rail-section live-rail-panel ${liveRailTab === "approvals" ? "live-rail-panel-active" : ""}`}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Approvals</p>
                  <h3>Resolve canon changes fast</h3>
                </div>
                <span className={`status-chip status-chip-${pendingApprovals.length > 0 ? "warning" : "healthy"}`}>{pendingApprovals.length}</span>
              </div>

              <div className="stack-list">
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((approval) => (
                    <ApprovalCard
                      actionState={approvalActionState[approval.id]}
                      approval={approval}
                      key={approval.id}
                      onApprove={approveApproval}
                      onReject={rejectApproval}
                    />
                  ))
                ) : (
                  <article className="approval-card approval-card-empty">
                    <strong>No canon changes waiting</strong>
                    <p>The live desk is clear. New AI proposals will appear here without leaving the map.</p>
                  </article>
                )}
              </div>
            </div>
          </aside>

          <div className="session-main">
            <TabletopBoard
              actors={state.actors}
              encounter={state.encounter}
              map={state.map}
              onAdvanceCombat={advanceCombat}
              onNudgeToken={nudgeToken}
              onRoll={rollCheck}
              onStartCombat={startCombat}
              scene={state.scene}
              tokens={tokens}
            />
          </div>

          <CopilotPanel
            approvalActionState={approvalActionState}
            approvals={state.approvals}
            context={context}
            copilot={copilot}
            diagnostics={state.diagnostics}
            intentErrorState={intentErrorState}
            onAdvanceWorldTick={advanceWorldTick}
            onApproveApproval={approveApproval}
            onInjectTranscript={injectTranscript}
            onLoadVoice={loadVoice}
            onRejectApproval={rejectApproval}
            onRefreshCopilot={refreshCopilot}
            onRequestApproval={requestApproval}
            onToggleTranscriptHealth={toggleTranscriptHealth}
            requestingIntentIds={requestingIntentIds}
            recap={state.lastRecap}
            voice={voice}
          />
        </section>
      ) : null}

      {mode === "hq" ? (
        <section className="hq-layout">
          <aside className="rail hq-nav" aria-label="Campaign HQ navigation">
            <div className="rail-section">
              <p className="eyebrow">Campaign HQ</p>
              <h2>Prep from consequences, not from blank pages.</h2>
              <p className="section-copy">
                Inbox, fronts, approvals, and recap live here so the live table stays tactical instead of becoming an admin dashboard.
              </p>
            </div>

            <div className="rail-section">
              <p className="eyebrow">Next objective</p>
              <p className="section-copy">{getCampaignObjective(players)}</p>
            </div>
          </aside>

          <div className="hq-feed">
            <section className="desk-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Inbox</p>
                  <h3>Between-session fallout</h3>
                </div>
              </div>

              <div className="stack-list">
                {state.inbox.length > 0 ? (
                  state.inbox.map((message) => (
                    <article className="inbox-card" key={message.id}>
                      <div className="inbox-card-header">
                        <h4>{message.title}</h4>
                        <time dateTime={message.createdAt}>{formatShortDate(message.createdAt)}</time>
                      </div>
                      <p>{message.body}</p>
                    </article>
                  ))
                ) : (
                  <article className="inbox-card inbox-card-empty">
                    <h4>No downtime fallout yet</h4>
                    <p>Advance the world tick from Live Session to generate campaign consequences, then return here for fallout.</p>
                    <Link className="secondary-button" href={getShellHref(campaignId, "live")} prefetch={false}>
                      Open live session actions
                    </Link>
                  </article>
                )}
              </div>
            </section>

            <section className="desk-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recap archive</p>
                  <h3>Campaign memory in one glance</h3>
                </div>
              </div>
              <p className="recap-block">{context.recap}</p>
              <div className="recent-event-stack">
                {context.recentEvents.map((event) => (
                  <div className="recent-event-row" key={event}>
                    <span className="recent-event-marker" />
                    <p>{event}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="rail hq-rail" aria-label="World pressure rail">
            <div className="rail-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Active fronts</p>
                  <h3>Pressure dashboard</h3>
                </div>
              </div>

              <div className="front-list">
                {state.fronts.map((front) => (
                  <article className="front-card" key={front.id}>
                    <div className="front-card-header">
                      <strong>{front.name}</strong>
                      <span>{front.progress}</span>
                    </div>
                    <p>{front.stakes}</p>
                    <div className="meter">
                      <span style={{ width: `${Math.min(100, front.progress * 10)}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rail-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Unresolved approvals</p>
                  <h3>Canon bottlenecks</h3>
                </div>
              </div>

              <div className="stack-list">
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((approval) => (
                    <ApprovalCard
                      actionState={approvalActionState[approval.id]}
                      approval={approval}
                      key={approval.id}
                      onApprove={approveApproval}
                      onReject={rejectApproval}
                    />
                  ))
                ) : (
                  <article className="approval-card approval-card-empty">
                    <strong>No canon changes waiting</strong>
                    <p>The world can advance without DM intervention right now.</p>
                  </article>
                )}
              </div>
            </div>

            <div className="rail-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recently resolved</p>
                  <h3>Trust the last few decisions</h3>
                </div>
              </div>

              <div className="stack-list">
                {recentlyResolvedApprovals.length > 0 ? (
                  recentlyResolvedApprovals.map((approval) => (
                    <ApprovalCard approval={approval} key={approval.id} showResolvedAt />
                  ))
                ) : (
                  <article className="approval-card approval-card-empty">
                    <strong>No recent resolutions</strong>
                    <p>Approve or reject a canon change to leave a short audit trail for the next prep pass.</p>
                  </article>
                )}
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      {mode === "companion" ? (
        <section className="companion-layout">
          <div className="companion-phone-frame">
            <div className="companion-phone">
              <div className="companion-topbar">
                <span>Companion</span>
                <span>{players.length} players</span>
              </div>

              <div className="companion-nav">
                <button
                  aria-pressed={companionSection === "sheet"}
                  className={companionSection === "sheet" ? "companion-nav-active" : ""}
                  onClick={() => setCompanionSection("sheet")}
                  type="button"
                >
                  Sheet
                </button>
                <button
                  aria-pressed={companionSection === "dice"}
                  className={companionSection === "dice" ? "companion-nav-active" : ""}
                  onClick={() => setCompanionSection("dice")}
                  type="button"
                >
                  Dice
                </button>
                <button
                  aria-pressed={companionSection === "recap"}
                  className={companionSection === "recap" ? "companion-nav-active" : ""}
                  onClick={() => setCompanionSection("recap")}
                  type="button"
                >
                  Recap
                </button>
                <button
                  aria-pressed={companionSection === "quest"}
                  className={companionSection === "quest" ? "companion-nav-active" : ""}
                  onClick={() => setCompanionSection("quest")}
                  type="button"
                >
                  Quest
                </button>
              </div>

              {companionSection === "sheet" ? (
                <>
                  <article className="companion-card">
                    <p className="eyebrow">Current objective</p>
                    <h3>Hold the parapet long enough to break the enemy advance.</h3>
                    <p>{getCampaignObjective(players)}</p>
                  </article>

                  {players.map((player) => (
                    <article className="companion-card" key={player.id}>
                      <div className="companion-card-header">
                        <div>
                          <p className="eyebrow">Character</p>
                          <h3>{player.name}</h3>
                        </div>
                        <button onClick={() => rollCheck(player.id, `${player.name} companion check`)} type="button">
                          Roll d20
                        </button>
                      </div>
                      <dl className="companion-stats">
                        <div>
                          <dt>Class</dt>
                          <dd>{player.sheet?.className ?? "Unlinked"}</dd>
                        </div>
                        <div>
                          <dt>HP</dt>
                          <dd>
                            {player.sheet?.hitPoints.current ?? "--"} / {player.sheet?.hitPoints.max ?? "--"}
                          </dd>
                        </div>
                        <div>
                          <dt>AC</dt>
                          <dd>{player.sheet?.armorClass ?? "--"}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </>
              ) : null}

              {companionSection === "dice" ? (
                <>
                  <article className="companion-card">
                    <p className="eyebrow">Dice</p>
                    <h3>Companion quick dice</h3>
                    <p>Keep single-tap checks handy for players who joined on mobile mid-scene.</p>
                  </article>

                  {players.map((player) => (
                    <article className="companion-card" key={`${player.id}-dice`}>
                      <div className="companion-card-header">
                        <div>
                          <p className="eyebrow">Quick roll</p>
                          <h3>{player.name}</h3>
                        </div>
                        <button onClick={() => rollCheck(player.id, `${player.name} mobile save`)} type="button">
                          Roll save
                        </button>
                      </div>
                      <p>{player.sheet?.className ?? "Adventurer"} can resolve a fast save without reopening the full desk.</p>
                    </article>
                  ))}
                </>
              ) : null}

              {companionSection === "recap" ? (
                <>
                  <article className="companion-card">
                    <p className="eyebrow">Recap</p>
                    <h3>Latest recap</h3>
                    <p>{state.lastRecap}</p>
                  </article>

                  <article className="companion-card">
                    <p className="eyebrow">Catch-up</p>
                    <h3>Late join summary</h3>
                    {catchUpTurns.length > 0 ? (
                      <div className="stack-list">
                        {catchUpTurns.map((turn) => (
                          <article className="companion-summary" key={turn.id}>
                            <strong>{turn.speaker}</strong>
                            <p>{turn.text}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p>No live turns yet. Join voice or inject a transcript turn to build the catch-up feed.</p>
                    )}
                  </article>
                </>
              ) : null}

              {companionSection === "quest" ? (
                <>
                  <article className="companion-card">
                    <p className="eyebrow">Quest</p>
                    <h3>Open fronts and approvals</h3>
                    <p>Surface only the pressure that players need on phone, not the full GM control deck.</p>
                  </article>

                  <article className="companion-card">
                    <p className="eyebrow">Front pressure</p>
                    <div className="front-list">
                      {state.fronts.map((front) => (
                        <article className="front-card" key={front.id}>
                          <div className="front-card-header">
                            <strong>{front.name}</strong>
                            <span>{front.progress}</span>
                          </div>
                          <p>{front.stakes}</p>
                          <div className="meter">
                            <span style={{ width: `${Math.min(100, front.progress * 10)}%` }} />
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>

                  <article className="companion-card">
                    <p className="eyebrow">Approvals</p>
                    <p>
                      {pendingApprovals.length > 0
                        ? `${pendingApprovals.length} canon changes are waiting on the DM.`
                        : "No canon changes are blocked right now."}
                    </p>
                  </article>
                </>
              ) : null}
            </div>
          </div>

          <aside className="rail companion-rail">
            <div className="rail-section">
              <p className="eyebrow">Player Companion</p>
              <h2>Phone-first, not DM-lite.</h2>
              <p className="section-copy">
                Keep sheets, dice, recap, and objective readable on a small screen. Heavy map editing stays on the live desk.
              </p>
            </div>

            <div className="rail-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Catch-up</p>
                  <h3>Late join summary</h3>
                </div>
              </div>
              <div className="stack-list">
                {catchUpTurns.length > 0 ? (
                  catchUpTurns.map((turn) => (
                    <article className="companion-summary" key={turn.id}>
                      <strong>{turn.speaker}</strong>
                      <p>{turn.text}</p>
                    </article>
                  ))
                ) : (
                  <article className="companion-summary">
                    <strong>No live turns yet</strong>
                    <p>Join voice or inject a transcript turn to build the catch-up feed.</p>
                  </article>
                )}
              </div>
            </div>
          </aside>
        </section>
      ) : null}
    </div>
  );
}

export type { ShellMode };
