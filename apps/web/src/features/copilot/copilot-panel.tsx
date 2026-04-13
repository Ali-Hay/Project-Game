"use client";

import type {
  ApprovalGate,
  ApprovalStatus,
  CopilotContextPack,
  CopilotResponse,
  ServiceHealth,
  SessionDiagnostics,
  SuggestedIntent,
  VoiceDescriptor
} from "@project-game/domain";

import { ApprovalCard, type ApprovalActionState } from "../approvals/approval-card";

interface CopilotPanelProps {
  recap: string;
  context: CopilotContextPack;
  diagnostics: SessionDiagnostics;
  approvals: ApprovalGate[];
  copilot: CopilotResponse | null;
  voice: VoiceDescriptor | null;
  approvalActionState: Record<string, ApprovalActionState>;
  intentErrorState: Record<string, string>;
  requestingIntentIds: string[];
  onRefreshCopilot: () => void;
  onInjectTranscript: () => void;
  onAdvanceWorldTick: () => void;
  onToggleTranscriptHealth: () => void;
  onLoadVoice: () => void;
  onRequestApproval: (intent: SuggestedIntent) => void;
  onApproveApproval: (approvalId: string) => void;
  onRejectApproval: (approvalId: string) => void;
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

function getApprovalByIntentId(approvals: ApprovalGate[], intentId: string, status: ApprovalStatus) {
  return approvals.find((approval) => approval.linkedId === intentId && approval.status === status);
}

function buildApprovalQueueSection(
  pendingApprovals: ApprovalGate[],
  approvalActionState: Record<string, ApprovalActionState>,
  onApproveApproval: (approvalId: string) => void,
  onRejectApproval: (approvalId: string) => void
) {
  return (
    <div className="rail-section copilot-queue-section">
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
            <ApprovalCard
              actionState={approvalActionState[approval.id]}
              approval={approval}
              key={approval.id}
              onApprove={onApproveApproval}
              onReject={onRejectApproval}
            />
          ))
        ) : (
          <article className="approval-card approval-card-empty">
            <strong>No pending approvals</strong>
            <p>Safe AI suggestions can flow without introducing canon ambiguity.</p>
          </article>
        )}
      </div>
    </div>
  );
}

export function CopilotPanel({
  recap,
  context,
  diagnostics,
  approvals,
  copilot,
  voice,
  approvalActionState,
  intentErrorState,
  requestingIntentIds,
  onRefreshCopilot,
  onInjectTranscript,
  onAdvanceWorldTick,
  onToggleTranscriptHealth,
  onLoadVoice,
  onRequestApproval,
  onApproveApproval,
  onRejectApproval
}: CopilotPanelProps) {
  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");
  const reviewedIntentIds = new Set(approvals.map((approval) => approval.linkedId));
  const visibleSuggestedIntents = copilot?.suggestedIntents.filter((intent) => !reviewedIntentIds.has(intent.id)) ?? [];
  const queueSection = buildApprovalQueueSection(pendingApprovals, approvalActionState, onApproveApproval, onRejectApproval);

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
      </div>

      {pendingApprovals.length > 0 ? queueSection : null}

      <div className="rail-section">
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

      {pendingApprovals.length === 0 ? queueSection : null}

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

            {visibleSuggestedIntents.map((intent) => {
              const pendingApproval = getApprovalByIntentId(approvals, intent.id, "pending");
              const requested = requestingIntentIds.includes(intent.id);
              const requestError = intentErrorState[intent.id];

              return (
                <article className="intent-card intent-card-proposal" key={intent.id}>
                  <div className="approval-card-header">
                    <strong>{intent.title}</strong>
                    <span className={`status-chip status-chip-${pendingApproval || requested ? "warning" : "healthy"}`}>
                      {pendingApproval ? "Queued" : requested ? "Requesting..." : intent.requiresApproval ? "Approval" : "Auto-safe"}
                    </span>
                  </div>

                  <p>{intent.detail}</p>

                  <div className="intent-card-actions">
                    <button
                      className="primary-button"
                      disabled={Boolean(pendingApproval) || requested || !intent.requiresApproval}
                      onClick={() => onRequestApproval(intent)}
                      type="button"
                    >
                      {pendingApproval ? "Queued for review" : requested ? "Requesting..." : "Request approval"}
                    </button>
                  </div>

                  {requestError ? <p className="approval-card-message">{requestError}</p> : null}
                </article>
              );
            })}

            {visibleSuggestedIntents.length === 0 ? (
              <article className="copilot-note copilot-note-empty">
                <p>Current approval-aware suggestions have already been queued or resolved. Refresh the copilot for a fresh recommendation.</p>
              </article>
            ) : null}
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
          {context.memoryFacts.length > 0 ? (
            context.memoryFacts.map((fact) => (
              <li className="memory-fact-row" key={fact.id}>
                <strong>{fact.subject}</strong>
                <span>{fact.predicate}</span>
                <em>{fact.object}</em>
              </li>
            ))
          ) : (
            <li className="memory-fact-row">
              <strong>No structured facts yet</strong>
              <span>memory queue</span>
              <em>Add transcript or world events to anchor the campaign memory.</em>
            </li>
          )}
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
