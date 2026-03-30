import Link from "next/link";

import type { CampaignSummary } from "@project-game/domain";

import { fetchCampaigns } from "../src/lib/session-api";

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
        <div>
          <p className="eyebrow">AI-Native Virtual Tabletop</p>
          <h1>Run the room, keep the world alive, let the AI carry the overhead.</h1>
          <p className="hero-copy">
            Project Game is built for online home groups that want a battle-ready tabletop, built-in voice and transcript
            awareness, and a campaign memory that does not forget what happened last week.
          </p>
        </div>
        <div className="landing-card">
          <p className="eyebrow">Included in this rewrite</p>
          <ul>
            <li>Authoritative session state and websocket updates</li>
            <li>Hybrid ledger plus derived memory</li>
            <li>Approval-aware AI copilot suggestions</li>
            <li>Living-world inbox and world tick surfaces</li>
          </ul>
        </div>
      </section>

      <section className="campaign-list-section">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Campaigns</p>
            <h2>Available rooms</h2>
          </div>
        </div>
        <div className="campaign-list">
          {campaigns.length > 0 ? (
            campaigns.map((entry) => (
              <Link className="campaign-link-card" href={`/campaigns/${entry.campaign.id}`} key={entry.campaign.id}>
                <h3>{entry.campaign.name}</h3>
                <p>{entry.campaign.summary}</p>
                <span>Scene: {entry.activeScene.name}</span>
              </Link>
            ))
          ) : (
            <article className="campaign-link-card">
              <h3>Session service offline</h3>
              <p>Start the session service to browse the live campaign shell from the web app.</p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
