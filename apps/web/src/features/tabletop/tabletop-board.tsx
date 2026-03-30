"use client";

import type { Actor, Encounter, MapAsset, Scene, Token } from "@project-game/domain";

interface TabletopBoardProps {
  actors: Record<string, Actor>;
  encounter: Encounter | null;
  map: MapAsset;
  scene: Scene;
  tokens: Token[];
  onNudgeToken: (tokenId: string, dx: number, dy: number) => void;
  onRoll: (actorId: string, label: string) => void;
  onStartCombat: () => void;
  onAdvanceCombat: () => void;
}

const boardLabels = Array.from({ length: 10 }, (_, index) => index);

export function TabletopBoard({
  actors,
  encounter,
  map,
  onAdvanceCombat,
  onNudgeToken,
  onRoll,
  onStartCombat,
  scene,
  tokens
}: TabletopBoardProps) {
  const initiativeTokens = encounter
    ? encounter.initiativeOrder.map((tokenId) => tokens.find((token) => token.id === tokenId)).filter((token): token is Token => Boolean(token))
    : [];

  return (
    <section className="battle-slate" aria-label="Battle slate">
      <div className="battle-slate-header">
        <div>
          <p className="eyebrow">Battle Slate</p>
          <h2>{scene.name}</h2>
          <p className="section-copy">{scene.description}</p>
        </div>

        <div className="slate-chips">
          <span className="status-chip status-chip-neutral">{map.name}</span>
          <span className="status-chip status-chip-neutral">{map.layers.length} layers</span>
          <span className="status-chip status-chip-neutral">{tokens.length} tokens</span>
        </div>
      </div>

      <div className="battle-slate-surface">
        <div className="board-metadata">
          <div>
            <p className="eyebrow">Map layers</p>
            <div className="layer-chip-row">
              {map.layers.map((layer) => (
                <span className="layer-chip" key={layer.id}>
                  {layer.name}
                </span>
              ))}
            </div>
          </div>

          <div className="board-callout">
            <p className="eyebrow">Live posture</p>
            <strong>{encounter ? `Initiative live: round ${encounter.round}` : "Exploration mode"}</strong>
            <span>{encounter ? "Combat drawer is tracking turn order and quick rolls." : "Players can move, roll, and stage the field before initiative."}</span>
          </div>
        </div>

        <div className="board-and-roster">
          <div className="board-frame">
            <div className="board-axis board-axis-columns">
              {boardLabels.map((label) => (
                <span key={`column-${label}`}>{label}</span>
              ))}
            </div>

            <div className="board-core">
              <div className="board-axis board-axis-rows">
                {boardLabels.map((label) => (
                  <span key={`row-${label}`}>{label}</span>
                ))}
              </div>

              <div className="board-grid">
                {Array.from({ length: 100 }).map((_, index) => (
                  <div className="board-cell" key={index} />
                ))}

                <div className="board-overlay board-overlay-ring" />
                <div className="board-overlay board-overlay-lantern" />

                {tokens.map((token) => {
                  const actor = actors[token.actorId];
                  const currentTurn = encounter ? encounter.initiativeOrder[encounter.turnIndex] === token.id : false;

                  return (
                    <div
                      className={`token-chip token-chip-${actor?.kind ?? "npc"} ${token.inEncounter ? "token-chip-active" : ""} ${
                        currentTurn ? "token-chip-current" : ""
                      }`}
                      key={token.id}
                      style={{
                        gridColumn: token.x + 1,
                        gridRow: token.y + 1
                      }}
                    >
                      <span>{token.label}</span>
                      <small>
                        {token.x},{token.y}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="token-roster" aria-label="Token roster">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Token roster</p>
                <h3>Keyboard-safe control mirror</h3>
              </div>
            </div>

            <div className="token-roster-list">
              {tokens.map((token) => {
                const actor = actors[token.actorId];

                return (
                  <article className="token-card" key={token.id}>
                    <div className="token-card-header">
                      <div>
                        <h4>{token.label}</h4>
                        <p>
                          {actor?.name ?? "Unknown actor"} · {actor?.kind ?? "npc"}
                        </p>
                      </div>
                      <span className={`status-chip status-chip-${token.inEncounter ? "warning" : "neutral"}`}>
                        {token.inEncounter ? "In encounter" : "Exploring"}
                      </span>
                    </div>

                    <dl className="token-stats">
                      <div>
                        <dt>Grid</dt>
                        <dd>
                          {token.x},{token.y}
                        </dd>
                      </div>
                      <div>
                        <dt>HP</dt>
                        <dd>
                          {actor?.sheet ? `${actor.sheet.hitPoints.current}/${actor.sheet.hitPoints.max}` : "--"}
                        </dd>
                      </div>
                      <div>
                        <dt>Init</dt>
                        <dd>{token.initiative ?? "--"}</dd>
                      </div>
                    </dl>

                    <div className="movement-pad" role="group" aria-label={`Move ${token.label}`}>
                      <button onClick={() => onNudgeToken(token.id, 0, -1)} type="button">
                        N
                      </button>
                      <button onClick={() => onNudgeToken(token.id, -1, 0)} type="button">
                        W
                      </button>
                      <button onClick={() => onRoll(token.actorId, `${token.label} check`)} type="button">
                        d20
                      </button>
                      <button onClick={() => onNudgeToken(token.id, 1, 0)} type="button">
                        E
                      </button>
                      <button onClick={() => onNudgeToken(token.id, 0, 1)} type="button">
                        S
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      <section className="combat-drawer" aria-label="Combat drawer">
        <div className="combat-drawer-header">
          <div>
            <p className="eyebrow">Combat drawer</p>
            <h3>{encounter ? `Round ${encounter.round}, turn ${encounter.turnIndex + 1}` : "Initiative not started"}</h3>
          </div>

          <div className="panel-actions">
            <button className="secondary-button" onClick={onStartCombat} type="button">
              Start combat
            </button>
            <button className="primary-button" disabled={!encounter} onClick={onAdvanceCombat} type="button">
              Advance turn
            </button>
          </div>
        </div>

        <div className="combat-drawer-grid">
          <div className="initiative-column">
            <p className="eyebrow">Initiative order</p>
            <div className="initiative-list">
              {encounter ? (
                initiativeTokens.map((token, index) => (
                  <article
                    className={`initiative-row ${encounter.turnIndex === index ? "initiative-row-current" : ""}`}
                    key={token.id}
                  >
                    <strong>{token.label}</strong>
                    <span>{token.initiative ?? "--"}</span>
                  </article>
                ))
              ) : (
                <article className="initiative-row initiative-row-empty">
                  <strong>Exploration mode</strong>
                  <span>Open with Start combat when the slate turns tactical.</span>
                </article>
              )}
            </div>
          </div>

          <div className="quick-roll-column">
            <p className="eyebrow">Quick rolls</p>
            <div className="quick-roll-grid">
              {tokens.slice(0, 4).map((token) => (
                <button className="quick-roll-button" key={token.id} onClick={() => onRoll(token.actorId, `${token.label} save`)} type="button">
                  <strong>{token.label}</strong>
                  <span>Roll save</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
