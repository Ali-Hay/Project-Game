"use client";

import type { ApprovalGate, CopilotContextPack, SessionDiagnostics } from "@project-game/domain";

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
    <section className="panel panel-stack">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI Copilot</p>
          <h2>Memory, recap, and graceful degradation</h2>
        </div>
        <button className="primary-button" onClick={onRefreshCopilot}>
          Refresh copilot
        </button>
      </div>

      <div className="copilot-recap">
        <p className="eyebrow">Latest recap</p>
        <p>{recap}</p>
      </div>

      <div className="action-row">
        <button onClick={onInjectTranscript}>Inject transcript turn</button>
        <button onClick={onAdvanceWorldTick}>Advance world tick</button>
        <button onClick={onToggleTranscriptHealth}>
          Transcript {diagnostics.transcript === "healthy" ? "degrade" : "restore"}
        </button>
        <button onClick={onLoadVoice}>Check voice</button>
      </div>

      <div className="copilot-grid">
        <article className="copilot-card">
          <p className="eyebrow">Memory facts</p>
          <ul>
            {context.memoryFacts.map((fact) => (
              <li key={fact.id}>
                <strong>{fact.subject}</strong> {fact.predicate} {fact.object}
              </li>
            ))}
          </ul>
        </article>

        <article className="copilot-card">
          <p className="eyebrow">Diagnostics</p>
          <ul>
            <li>Voice: {diagnostics.voice}</li>
            <li>Transcript: {diagnostics.transcript}</li>
            <li>AI: {diagnostics.ai}</li>
            <li>Memory: {diagnostics.memory}</li>
          </ul>
        </article>

        <article className="copilot-card">
          <p className="eyebrow">Pending approvals</p>
          <ul>
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((approval) => <li key={approval.id}>{approval.title}</li>)
            ) : (
              <li>No pending canon changes.</li>
            )}
          </ul>
        </article>

        <article className="copilot-card">
          <p className="eyebrow">Voice provider</p>
          {voice ? (
            <>
              <p>{voice.provider}</p>
              <p>{voice.status}</p>
              <p>{voice.note}</p>
            </>
          ) : (
            <p>Voice transport has not been checked yet.</p>
          )}
        </article>
      </div>

      <div className="copilot-card">
        <p className="eyebrow">Recent events</p>
        <ul className="recent-events">
          {context.recentEvents.map((event) => (
            <li key={event}>{event}</li>
          ))}
        </ul>
      </div>

      <div className="copilot-card">
        <p className="eyebrow">Copilot guidance</p>
        {copilot ? (
          <div className="copilot-card-body">
            <ul>
              {copilot.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            <ul>
              {copilot.suggestedIntents.map((intent) => (
                <li key={intent.id}>
                  <strong>{intent.title}</strong>: {intent.detail}
                  {intent.requiresApproval ? " Requires DM approval." : " Auto-safe intent."}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Refresh the copilot to load AI guidance and approval-aware intent suggestions.</p>
        )}
      </div>
    </section>
  );
}
