import type { AIIntentType } from "./types";

const autoApprovedIntents = new Set<AIIntentType>([
  "suggestion.publish",
  "recap.publish",
  "surface.banner"
]);

export function intentRequiresApproval(intentType: AIIntentType): boolean {
  return !autoApprovedIntents.has(intentType);
}
