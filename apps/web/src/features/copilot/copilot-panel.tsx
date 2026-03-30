"use client";

import type { ApprovalGate, CopilotContextPack, ServiceHealth, SessionDiagnostics } from "@project-game/domain";

import type { CopilotResponse, VoiceDescriptor } from "../../lib/session-api";

interface CopilotPanelProps {
  recap: string;
  context: CopilotContextPack;
  diagnostics: SessionDiagnostics;
  approvals: ApprovalGate[];
  copilot: CopilotResponse | null;
  voice: VoiceDescriptor | null;
  onRefreshCopilot: () => void;
  onInjectTranscript: () => void;
  onAdvanceWorldTick: () => void;
  onToggleTranscriptHealth: () => void;
  onLoadVoice: () => void;
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

function formatApprovalSource(type: ApprovalGate["type"]) {
  return type === "canon-change" ? "Canon change" : "AI intent";
}

export function CopilotPanel({
  recap,
  context,
  diagnostics,
  approvals,
  copilot,
  voice,
  onRefreshCopilot,
  onInjectTranscript,
  onAdvanceWorldTick,
  onToggleTranscriptHealth,
  onLoadVoice
}: CopilotPanelProps) {
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");

  return (
    <aside className="rail copilot-rail" aria-label="AI copilot rail">
      <div className="rail-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AI Copilot</p>
            <h2>Approval-aware command deck</h2>
          </div>
          <button className="primary-button" onClick={onRefreshCopilot} type="button">
            Refresh copilot
          </button>
        </div>

        <div className="recap-card">
          <p className="eyebrow">Latest recap</p>
          <p>{recap}</p>
        </div>

        <div className="helper-deck">
          <button className="helper-action" onClick={onInjectTranscript} type="button">
            <strong>Inject transcript</strong>
            <span>Add a narrated turn to the live rail.</span>
          </button>
          <button className="helper-action" onClick={onAdvanceWorldTick} type="button">
            <strong>Advance world tick</strong>
            <span>Push factions, fronts, and inbox fallout.</span>
          </button>
          <button className="helper-action" onClick={onToggleTranscriptHealth} type="button">
            <strong>Toggle transcript</strong>
            <span>Exercise degraded-mode handling in the UI.</span>
          </button>
          <button className="helper-action" onClick={onLoadVoice} type="button">
            <strong>Check voice transport</strong>
            <span>Inspect provider readiness without leaving the rail.</span>
          </button>
        </div>
      </div>

      <div className="rail-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Approval queue</p>
            <h3>Canon changes waiting on the DM</h3>
          </div>
          <span className={`status-chip status-chip-${pendingApprovals.length > 0 ? "warning" : "healthy"}`}>{pendingApprovals.length}</span>
        </div>

        <div className="stack-list">
          {pendingApprovals.length > 0 ? (
            pendingApprovals.map((approval) => (
              <article className="approval-card" key={approval.id}>
                <div className="approval-card-header">
                  <strong>{approval.title}</strong>
                  <span>{formatApprovalSource(approval.type)}</span>
                </div>
                <p>{approval.detail}</p>
              </article>
            ))
          ) : (
            <article className="approval-card approval-card-empty">
              <strong>No pending approvals</strong>
              <p>Safe AI suggestions can flow without introducing canon ambiguity.</p>
            </article>
          )}
        </div>
      </div>

      <div className="rail-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Copilot output</p>
            <h3>Guidance and suggested intents</h3>
          </div>
        </div>

        {copilot ? (
          <div className="stack-list">
            {copilot.messages.map((message) => (
              <article className="copilot-note" key={message}>
                <p>{message}</p>
              </article>
            ))}

            {copilot.suggestedIntents.map((intent) => (
              <article className="intent-card" key={intent.id}>
                <div className="approval-card-header">
                  <strong>{intent.title}</strong>
                  <span className={`status-chip status-chip-${intent.requiresApproval ? "warning" : "healthy"}`}>
                    {intent.requiresApproval ? "Approval" : "Auto-safe"}
                  </span>
                </div>
                <p>{intent.detail}</p>
              </article>
            ))}
          </div>
        ) : (
          <article className="copilot-note copilot-note-empty">
            <p>Refresh the copilot to load scene guidance, next-step prompts, and approval-aware suggestions.</p>
          </article>
        )}
      </div>

      <div className="rail-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Memory facts</p>
            <h3>Structured campaign anchors</h3>
          </div>
        </div>

        <ul className="memory-fact-list">
          {context.memoryFacts.map((fact) => (
            <li className="memory-fact-row" key={fact.id}>
              <strong>{fact.subject}</strong>
              <span>{fact.predicate}</span>
              <em>{fact.object}</em>
            </li>
          ))}
        </ul>
      </div>

      <div className="rail-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Runtime diagnostics</p>
            <h3>Keep the table dependable</h3>
          </div>
        </div>

        <div className="diagnostic-list">
          {Object.entries(diagnostics).map(([service, status]) => (
            <div className="diagnostic-row" key={service}>
              <span>{service}</span>
              <strong className={`diagnostic-value diagnostic-value-${getHealthTone(status)}`}>{status}</strong>
            </div>
          ))}
        </div>

        <article className="voice-card">
          <div className="approval-card-header">
            <strong>{voice?.provider ?? "Voice transport"}</strong>
            <span className={`status-chip status-chip-${getHealthTone(voice?.status === "needs-config" ? "offline" : diagnostics.voice)}`}>
              {voice?.status ?? diagnostics.voice}
            </span>
          </div>
          <p>{voice?.note ?? "Voice transport has not been checked yet."}</p>
        </article>
      </div>
    </aside>
  );
}
