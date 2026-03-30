import { notFound } from "next/navigation";

import { CampaignShell } from "../../../src/features/campaign/campaign-shell";
import { fetchCampaigns, fetchRoomState } from "../../../src/lib/session-api";

export default async function CampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const campaigns = await fetchCampaigns();
  const entry = campaigns.find((candidate) => candidate.campaign.id === campaignId);

  if (!entry) {
    notFound();
  }

  const payload = await fetchRoomState(entry.roomId);

  return <CampaignShell roomId={entry.roomId} initialState={payload.state} initialContext={payload.context} />;
}
