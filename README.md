# AstroCoach

AstroCoach is a responsive, bilingual self-exploration application that uses astrology as a contextual inquiry lens. The current prototype scope is limited to EXPLORE mode.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and provide the required values.
3. Start PostgreSQL with `docker compose up -d postgres`, or set `DATABASE_URL` to a pooled Neon PostgreSQL connection and `DIRECT_URL` to its direct migration connection.
4. Apply migrations with `npm run db:deploy`.
5. Seed the development user with `npm run db:seed`.
6. Start the application with `npm run dev`.

The seeded development identity is `dev@astrocoach.local`. It is intentionally not a login credential.

Use `npm run db:studio` to inspect local or Neon data with Prisma Studio.

## Verification

Run all static and production-build checks with:

```bash
npm run check
```

See `PROJECT_DECISIONS.md` for durable decisions and `PROJECT_PROGRESS.md` for current implementation status.
