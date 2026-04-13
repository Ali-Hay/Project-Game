import { z } from "zod";

export const baseCommandSchema = z.object({
  commandId: z.string(),
  issuedAt: z.string().datetime().optional()
});

export const roomJoinCommandSchema = baseCommandSchema.extend({
  type: z.literal("room.join"),
  actorId: z.string(),
  role: z.enum(["gm", "player", "observer", "agent"])
});

export const tokenMoveCommandSchema = baseCommandSchema.extend({
  type: z.literal("token.move"),
  tokenId: z.string(),
  x: z.number(),
  y: z.number()
});

export const diceRollCommandSchema = baseCommandSchema.extend({
  type: z.literal("dice.roll"),
  actorId: z.string(),
  label: z.string(),
  count: z.number().int().min(1).max(10),
  sides: z.number().int().min(2).max(100),
  modifier: z.number().int().min(-20).max(20).default(0)
});

export const combatStartCommandSchema = baseCommandSchema.extend({
  type: z.literal("combat.start")
});

export const combatAdvanceCommandSchema = baseCommandSchema.extend({
  type: z.literal("combat.advance")
});

export const canonChangeCommandSchema = baseCommandSchema.extend({
  type: z.literal("canon.change.propose"),
  title: z.string(),
  detail: z.string(),
  sourceIntentId: z.string()
});

export const aiIntentRequestCommandSchema = baseCommandSchema.extend({
  type: z.literal("ai.intent.request"),
  intentId: z.string(),
  // Only intents with a concrete executor path should be requestable.
  intentType: z.literal("world.tick.apply"),
  title: z.string(),
  detail: z.string()
});

export const aiIntentApproveCommandSchema = baseCommandSchema.extend({
  type: z.literal("ai.intent.approve"),
  approvalId: z.string()
});

export const aiIntentRejectCommandSchema = baseCommandSchema.extend({
  type: z.literal("ai.intent.reject"),
  approvalId: z.string(),
  reason: z.string().optional()
});

export const commandSchema = z.discriminatedUnion("type", [
  roomJoinCommandSchema,
  tokenMoveCommandSchema,
  diceRollCommandSchema,
  combatStartCommandSchema,
  combatAdvanceCommandSchema,
  canonChangeCommandSchema,
  aiIntentRequestCommandSchema,
  aiIntentApproveCommandSchema,
  aiIntentRejectCommandSchema
]);

export type SessionCommand = z.infer<typeof commandSchema>;
