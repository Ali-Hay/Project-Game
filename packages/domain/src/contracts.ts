import { z } from "zod";

export const serviceHealthSchema = z.enum(["healthy", "degraded", "offline"]);
export const participantRoleSchema = z.enum(["gm", "player", "observer", "agent"]);
export const aiIntentTypeSchema = z.enum([
  "suggestion.publish",
  "recap.publish",
  "surface.banner",
  "canon.change",
  "npc.attitude.change",
  "world.tick.apply"
]);

const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  sessionId: z.string()
});

const sceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  mapId: z.string(),
  activeLayerIds: z.array(z.string()),
  description: z.string()
});

const copilotContextPackSchema = z.object({
  recap: z.string(),
  recentEvents: z.array(z.string()),
  memoryFacts: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      predicate: z.string(),
      object: z.string(),
      confidence: z.number(),
      sourceEventId: z.string()
    })
  ),
  graph: z.record(z.array(z.string())),
  budgets: z.object({
    recencyEvents: z.number().int(),
    factLimit: z.number().int(),
    summaryCharacters: z.number().int()
  })
});

export const campaignSummarySchema = z.object({
  roomId: z.string(),
  campaign: campaignSchema,
  activeScene: sceneSchema,
  diagnostics: z.object({
    voice: serviceHealthSchema,
    transcript: serviceHealthSchema,
    ai: serviceHealthSchema,
    memory: serviceHealthSchema
  })
});

export const copilotRequestSchema = z.object({
  campaignId: z.string(),
  roomId: z.string(),
  prompt: z.string().optional()
});

export const transcriptTurnRequestSchema = z.object({
  speaker: z.string(),
  speakerRole: participantRoleSchema,
  text: z.string().min(1)
});

export const voiceDescriptorSchema = z.object({
  provider: z.string(),
  roomName: z.string(),
  token: z.string(),
  status: z.enum(["ready", "mock", "needs-config"]),
  note: z.string()
});

export const copilotResponseSchema = z.object({
  context: copilotContextPackSchema,
  messages: z.array(z.string()),
  suggestedIntents: z.array(
    z.object({
      id: z.string(),
      type: aiIntentTypeSchema,
      title: z.string(),
      detail: z.string(),
      suggestedBy: z.enum(["copilot", "world-tick", "autonomous-dm"]),
      requiresApproval: z.boolean()
    })
  )
});

export type CopilotRequest = z.infer<typeof copilotRequestSchema>;
export type TranscriptTurnRequest = z.infer<typeof transcriptTurnRequestSchema>;
