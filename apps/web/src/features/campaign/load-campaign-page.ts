import { notFound } from "next/navigation";

import { fetchCampaigns, fetchRoomState } from "../../lib/session-api";

export async function loadCampaignPage(campaignId: string) {
  const campaigns = await fetchCampaigns();
  const entry = campaigns.find((candidate) => candidate.campaign.id === campaignId);

  if (!entry) {
    notFound();
  }

  const payload = await fetchRoomState(entry.roomId);

  return {
    roomId: entry.roomId,
    state: payload.state,
    context: payload.context
  };
}
