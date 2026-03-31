import { CampaignShell } from "../../../../src/features/campaign/campaign-shell";
import { loadCampaignPage } from "../../../../src/features/campaign/load-campaign-page";

export default async function CampaignHqPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const payload = await loadCampaignPage(campaignId);

  return (
    <CampaignShell
      campaignId={campaignId}
      roomId={payload.roomId}
      initialContext={payload.context}
      initialState={payload.state}
      mode="hq"
    />
  );
}
