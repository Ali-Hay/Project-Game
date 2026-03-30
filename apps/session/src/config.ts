import { z } from "zod";

const envSchema = z.object({
  SESSION_HOST: z.string().default("0.0.0.0"),
  SESSION_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  VOICE_PROVIDER: z.enum(["mock", "livekit"]).default("mock"),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_WS_URL: z.string().optional(),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.string().optional()
});

export type SessionConfig = z.infer<typeof envSchema>;

export function readConfig(): SessionConfig {
  return envSchema.parse(process.env);
}
