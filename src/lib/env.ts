import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.6-luna"),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    DATABASE_URL:
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.astro_DATABASE_URL ||
      process.env.astro_POSTGRES_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL || undefined,
  });
}
