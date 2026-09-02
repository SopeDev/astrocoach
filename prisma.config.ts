import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx src/db/seed.ts",
  },
  datasource: {
    url:
      process.env.DIRECT_URL ||
      process.env.POSTGRES_URL ||
      process.env.astro_POSTGRES_URL ||
      process.env.astro_DATABASE_URL ||
      env("DATABASE_URL"),
  },
});
