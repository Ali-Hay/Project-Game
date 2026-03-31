import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().optional(),
  SESSION_HOST: z.string().default("0.0.0.0"),
  SESSION_PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  VOICE_PROVIDER: z.enum(["mock", "livekit"]).default("mock"),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_WS_URL: z.string().optional(),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.string().optional()
});

type RawSessionConfig = z.infer<typeof envSchema>;
export type SessionConfig = Omit<RawSessionConfig, "PORT" | "SESSION_PORT"> & {
  SESSION_PORT: number;
};

export function readConfig(): SessionConfig {
  const config = envSchema.parse(process.env);

  return {
    ...config,
    SESSION_PORT: config.SESSION_PORT ?? config.PORT ?? 4000
  };
}
