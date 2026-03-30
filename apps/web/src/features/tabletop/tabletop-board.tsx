"use client";

import type { Encounter, Token } from "@project-game/domain";

interface TabletopBoardProps {
  tokens: Token[];
  encounter: Encounter | null;
  onNudgeToken: (tokenId: string, dx: number, dy: number) => void;
  onRoll: (actorId: string, label: string) => void;
  onStartCombat: () => void;
  onAdvanceCombat: () => void;
}

export function TabletopBoard({
  tokens,
  encounter,
  onNudgeToken,
  onRoll,
  onStartCombat,
  onAdvanceCombat
}: TabletopBoardProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Live Table</p>
          <h2>Authoritative battle board</h2>
        </div>
        <div className="panel-actions">
          <button className="secondary-button" onClick={onStartCombat}>
            Start combat
          </button>
          <button className="primary-button" onClick={onAdvanceCombat} disabled={!encounter}>
            Next turn
          </button>
        </div>
      </div>

      <div className="board-grid">
        {Array.from({ length: 100 }).map((_, index) => (
          <div className="board-cell" key={index} />
        ))}

        {tokens.map((token) => (
          <div
            className={`token-chip ${token.inEncounter ? "token-chip-active" : ""}`}
            key={token.id}
            style={{
              gridColumn: token.x + 1,
              gridRow: token.y + 1
            }}
          >
            {token.label}
          </div>
        ))}
      </div>

      <div className="token-list">
        {tokens.map((token) => (
          <article className="token-card" key={token.id}>
            <div>
              <h3>{token.label}</h3>
              <p>
                Grid {token.x},{token.y}
              </p>
            </div>
            <div className="token-actions">
              <button onClick={() => onNudgeToken(token.id, 1, 0)}>+X</button>
              <button onClick={() => onNudgeToken(token.id, -1, 0)}>-X</button>
              <button onClick={() => onNudgeToken(token.id, 0, 1)}>+Y</button>
              <button onClick={() => onNudgeToken(token.id, 0, -1)}>-Y</button>
              <button onClick={() => onRoll(token.actorId, `${token.label} check`)}>Roll d20</button>
            </div>
          </article>
        ))}
      </div>

      {encounter ? (
        <div className="encounter-strip">
          <span>Round {encounter.round}</span>
          <span>Turn {encounter.turnIndex + 1}</span>
          <span>{encounter.initiativeOrder.length} combatants</span>
        </div>
      ) : (
        <div className="encounter-strip encounter-strip-muted">Exploration mode. No initiative has started yet.</div>
      )}
    </section>
  );
}
