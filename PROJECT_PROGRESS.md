# Project Progress

Last updated: 2026-09-01

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

## Remaining

- Implement language-first onboarding and persist the user's selection.
- Implement birth data collection with optional birth time.
- Add worldwide birthplace search and historical timezone resolution.
- Calculate and persist the initial natal chart data.
- Capture a current concern and create a conversation.
- Implement EXPLORE responses with structured internal signals.
- Save and resume conversations.

## Known issues and open questions

- The Prisma Postgres connection is currently shared by Production and Preview deployments. A separate preview database should be introduced before schema-changing preview deployments become routine.
- OpenCage and GeoNames credentials from the earlier `astro-ai` prototype may be reused later, but no credentials have been copied into this repository.
- The natal calculation engine will be selected in its dedicated slice after comparing the practical open-source and hosted options.
- Proper authentication is intentionally deferred; the development user is not an authentication mechanism.
- Prisma CLI 7.10 currently brings audit findings through its bundled, unused MySQL driver and configuration merge utility. The application uses PostgreSQL, runtime packages are unaffected, and npm's suggested fix is an unsupported breaking Prisma downgrade, so it was not applied.

## Next planned slice

Build the language-first onboarding screen for English and Spanish, persist the selected locale to the development user, and establish localized routing/content behavior.
