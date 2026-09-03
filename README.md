# AstroCoach

AstroCoach is a responsive, bilingual astrological self-exploration application informed by evolutionary and Kabbalistic astrology. The current prototype implements the EXPLORE and RECOGNIZE conversation modes while grounding interpretations in the user's lived experience.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and provide the required values.
3. Start PostgreSQL with `docker compose up -d postgres`, or set `DATABASE_URL` to a Prisma Postgres connection. Vercel Marketplace aliases are also supported automatically.
4. Apply migrations with `npm run db:deploy`.
5. Seed the development user with `npm run db:seed`.
6. Start the application with `npm run dev`.

The seeded development identity is `dev@astrocoach.local`. It is intentionally not a login credential.

## Google authentication

AstroCoach uses Auth.js with Google OAuth and database-backed sessions. Create a Google OAuth web client and configure these authorized redirect URIs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR_DOMAIN/api/auth/callback/google`

Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and a cryptographically random `AUTH_SECRET` in `.env.local` and in the Vercel project environment. Generate an Auth.js secret with `npx auth secret` or `openssl rand -base64 32`.

Use `npm run db:studio` to inspect local or Neon data with Prisma Studio.

## Verification

Run all static and production-build checks with:

```bash
npm run check
```

See `PROJECT_DECISIONS.md` for durable decisions and `PROJECT_PROGRESS.md` for current implementation status.
