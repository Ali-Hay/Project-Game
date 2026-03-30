import Link from "next/link";

import type { CampaignSummary } from "@project-game/domain";

import { fetchCampaigns } from "../src/lib/session-api";

const shellPreview = [
  {
    name: "Live Session",
    detail: "Map-first desk with transcript rail, copilot approvals, and a combat drawer."
  },
  {
    name: "Campaign HQ",
    detail: "Between-session inbox, faction pressure, unresolved fronts, and prep memory."
  },
  {
    name: "Player Companion",
    detail: "Phone-first sheet, dice, recap, and late-join catch-up."
  }
];

function getHealthTone(status: CampaignSummary["diagnostics"]["transcript"]) {
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

export default async function HomePage() {
  let campaigns: CampaignSummary[] = [];

  try {
    campaigns = await fetchCampaigns();
  } catch {
    campaigns = [];
  }

  return (
    <main className="home-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">AI-Native Virtual Tabletop</p>
          <h1>Run the room on a tactical slate. Let memory, recap, and world pressure stay alive around it.</h1>
          <p className="hero-copy">
            Project Game is a living-world campaign desk for online home groups: authoritative session state, AI-aware transcript
            rails, approval-gated copilot work, and between-session consequences that do not vanish when the call ends.
          </p>
        </div>

        <div className="landing-hero-panel">
          <p className="eyebrow">Operating model</p>
          <ul className="shell-preview-list">
            {shellPreview.map((shell) => (
              <li className="shell-preview-card" key={shell.name}>
                <strong>{shell.name}</strong>
                <p>{shell.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="campaign-list-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Available rooms</p>
            <h2>Jump into a live campaign desk</h2>
          </div>
        </div>

        <div className="campaign-list">
          {campaigns.length > 0 ? (
            campaigns.map((entry) => (
              <Link className="campaign-link-card" href={`/campaigns/${entry.campaign.id}`} key={entry.campaign.id}>
                <div className="campaign-link-card-header">
                  <div>
                    <p className="eyebrow">Campaign</p>
                    <h3>{entry.campaign.name}</h3>
                  </div>
                  <span className={`status-chip status-chip-${getHealthTone(entry.diagnostics.transcript)}`}>{entry.diagnostics.transcript}</span>
                </div>
                <p>{entry.campaign.summary}</p>
                <div className="campaign-link-footer">
                  <span>Scene: {entry.activeScene.name}</span>
                  <span>Open desk</span>
                </div>
              </Link>
            ))
          ) : (
            <article className="campaign-link-card campaign-link-card-empty">
              <p className="eyebrow">Session service offline</p>
              <h3>No rooms available yet</h3>
              <p>Start the session service to browse the live campaign desk from the web app.</p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
