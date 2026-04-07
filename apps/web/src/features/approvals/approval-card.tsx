"use client";

import type { ApprovalGate } from "@project-game/domain";

export interface ApprovalActionState {
  phase: "idle" | "approving" | "rejecting" | "failed";
  message?: string;
}

interface ApprovalCardProps {
  approval: ApprovalGate;
  actionState?: ApprovalActionState;
  onApprove?: (approvalId: string) => void;
  onReject?: (approvalId: string) => void;
  showResolvedAt?: boolean;
}

const utcShortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC"
});

function formatShortDate(value: string) {
  return `${utcShortDateFormatter.format(new Date(value))} UTC`;
}

function getApprovalTone(approval: ApprovalGate, actionState?: ApprovalActionState) {
  if (actionState?.phase === "failed") {
    return "danger";
  }

  if (approval.status === "approved") {
    return "healthy";
  }

  if (approval.status === "rejected") {
    return "neutral";
  }

  return "warning";
}

function getApprovalStatusLabel(approval: ApprovalGate, actionState?: ApprovalActionState) {
  if (actionState?.phase === "approving") {
    return "Approving...";
  }

  if (actionState?.phase === "rejecting") {
    return "Rejecting...";
  }

  if (actionState?.phase === "failed") {
    return "Could not apply";
  }

  if (approval.status === "approved") {
    return "Applied";
  }

  if (approval.status === "rejected") {
    return "Rejected";
  }

  return "Queued";
}

function formatApprovalSource(approval: ApprovalGate) {
  if (approval.type === "canon-change") {
    return "Canon change";
  }

  return approval.intentType === "world.tick.apply" ? "World tick intent" : "AI intent";
}

export function ApprovalCard({ approval, actionState, onApprove, onReject, showResolvedAt = false }: ApprovalCardProps) {
  const isPending = approval.status === "pending";
  const isBusy = actionState?.phase === "approving" || actionState?.phase === "rejecting";
  const showActions = isPending && onApprove && onReject;
  const timestamp = showResolvedAt && approval.resolvedAt ? approval.resolvedAt : approval.requestedAt;
  const timestampLabel = showResolvedAt && approval.resolvedAt ? "Resolved" : "Requested";

  return (
    <article className="approval-card">
      <div className="approval-card-header">
        <strong>{approval.title}</strong>
        <span className={`status-chip status-chip-${getApprovalTone(approval, actionState)}`}>{getApprovalStatusLabel(approval, actionState)}</span>
      </div>

      <div className="approval-card-meta">
        <span>{formatApprovalSource(approval)}</span>
        <time dateTime={timestamp}>
          {timestampLabel} {formatShortDate(timestamp)}
        </time>
      </div>

      <p>{approval.detail}</p>

      {showActions ? (
        <div className="approval-card-actions">
          <button className="primary-button" disabled={isBusy} onClick={() => onApprove(approval.id)} type="button">
            {actionState?.phase === "approving" ? "Approving..." : "Approve canon change"}
          </button>
          <button className="secondary-button" disabled={isBusy} onClick={() => onReject(approval.id)} type="button">
            {actionState?.phase === "rejecting" ? "Rejecting..." : "Reject"}
          </button>
        </div>
      ) : null}

      {actionState?.message ? <p className="approval-card-message">{actionState.message}</p> : null}
    </article>
  );
}
