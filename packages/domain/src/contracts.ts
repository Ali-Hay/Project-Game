import { z } from "zod";

export const serviceHealthSchema = z.enum(["healthy", "degraded", "offline"]);

export const campaignSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  sceneName: z.string()
});

export const copilotRequestSchema = z.object({
  campaignId: z.string(),
  roomId: z.string(),
  prompt: z.string().optional()
});

export const transcriptTurnRequestSchema = z.object({
  speaker: z.string(),
  speakerRole: z.enum(["gm", "player", "observer", "agent"]),
  text: z.string().min(1)
});

export type CopilotRequest = z.infer<typeof copilotRequestSchema>;
export type TranscriptTurnRequest = z.infer<typeof transcriptTurnRequestSchema>;
