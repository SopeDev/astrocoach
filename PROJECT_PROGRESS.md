# Project Progress

Last updated: 2026-09-02

## Implemented

- Reviewed the authoritative product guide, prompt architecture, and initial implementation brief.
- Established a Next.js App Router and TypeScript application scaffold.
- Added Tailwind CSS, a responsive calm visual shell, and system/light/dark theme support.
- Added English and Spanish locale definitions and starter message catalogs.
- Added PostgreSQL and Prisma 7 configuration with an idempotent seeded development user.
- Added server-only environment configuration, including a configurable OpenAI model.
- Added local PostgreSQL container configuration and Vercel-compatible environment conventions.
- Added the required project-level implementation instructions in `AGENTS.md`.
- Generated and validated the initial Prisma migration and Prisma Client for the user schema.
- Verified linting, strict TypeScript checking, and a production Next.js build.
- Initialized the Git repository, pushed the scaffold to `SopeDev/astrocoach`, and connected the Vercel `astrocoach` project.
- Connected a Prisma Postgres database through Vercel and added safe environment-variable alias resolution.
- Applied the initial production migration and seeded `dev@astrocoach.local` in Prisma Postgres.
- Implemented language-first onboarding with English and Spanish selection, server-side persistence to the development user, an HTTP-only locale cookie, localized routes, and translated starter content.
- Established the mobile-first PWA foundation with install metadata, standalone display configuration, theme-aware mobile browser metadata, and platform app icons.
- Added Google authentication with Auth.js, Prisma-backed accounts and sessions, a localized mobile-first sign-in screen, authenticated onboarding protection, and locale persistence after sign-in.
- Removed runtime dependence on the shared seeded development user and applied the authentication migration to the managed Prisma Postgres database.
- Implemented localized, mobile-first birth date and optional birth time collection with authenticated persistence, edit support, server validation, and explicit unknown-time handling.

## Remaining

- Add worldwide birthplace search and historical timezone resolution.
- Calculate and persist the initial natal chart data.
- Capture a current concern and create a conversation.
- Implement EXPLORE responses with structured internal signals.
- Save and resume conversations.

## Known issues and open questions

- The Prisma Postgres connection is currently shared by Production and Preview deployments. A separate preview database should be introduced before schema-changing preview deployments become routine.
- OpenCage and GeoNames credentials from the earlier `astro-ai` prototype may be reused later, but no credentials have been copied into this repository.
- The natal calculation engine will be selected in its dedicated slice after comparing the practical open-source and hosted options.
- Google sign-in requires `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` in local and Vercel environments before the OAuth flow can run.
- Email/password authentication is intentionally reserved for a focused security slice covering verification, recovery, rate limiting, password hashing, and safe account linking.
- Prisma CLI 7.10 currently brings audit findings through its bundled, unused MySQL driver and configuration merge utility. The application uses PostgreSQL, runtime packages are unaffected, and npm's suggested fix is an unsupported breaking Prisma downgrade, so it was not applied.

## Next planned slice

Add localized worldwide birthplace search, persist coordinates and an IANA timezone, and resolve the historically applicable UTC offset for the saved birth date and time.
