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
- Added authenticated worldwide birthplace search through a server-mediated GeoNames endpoint, keyboard-accessible mobile results, authoritative server-side place verification, coordinates and IANA timezone persistence, and historical UTC instant resolution for known birth times.
- Added locally computed natal charts with pinned Celestine 0.2.1, a project-owned versioned data contract, input hashing and calculation provenance, Placidus houses for exact times, strict omission of time-dependent structures for unknown times, automatic stale-chart invalidation, and reference tests.
- Added a real saving/calculation transition after birthplace submission and a localized chart-review screen showing source birth details, planetary and node positions, decimal longitudes, angles, and expandable house cusps for manual verification.
- Added Chiron to exact and unknown-time chart calculations and upgraded the calculation transition to a full-screen, reduced-motion-aware celestial animation with moving stars, connecting constellation lines, and orbital motion.
- Added initial-intent onboarding with selectable life areas and optional current context, moved chart calculation and its full-screen transition after that intake, generated localized discovery questions from chart-plus-user context, and removed the technical chart review from the normal flow.
- Refined Initial Discovery into a single-screen five-step flow: exactly three opening questions, persisted answers at a locked stage boundary, exactly two adaptive finalizing questions, within-stage back navigation, progress feedback, localized fallbacks, and persisted completion state.
- Reworked English and Spanish onboarding copy around personal relevance and a warm reflective-partner voice, removing implementation-oriented calculation language and repetitive chart disclaimers from the user interface.
- Added the first authenticated EXPLORE conversation loop with a mobile-first “What’s going on?” chat, onboarding-to-chat handoff, PostgreSQL conversation and message persistence, resume of the latest active thread, retry-safe user-message storage, and localized loading and failure states.
- Implemented OpenAI Structured Outputs for EXPLORE with natural visible replies separated from internal understanding, uncertainty, candidate-pattern, and mode-recommendation signals; requests use completed onboarding, natal context, recent thread history, and the latest message while disabling provider-side response storage.
- Added a one-time post-discovery orientation that explains the product through the user's actions—share, explore, and keep—before entering the main application.
- Added a mobile-first authenticated application shell with Home, Conversations, and My Map navigation plus an Account avatar in the header.
- Added a Home starting point for new EXPLORE conversations, conversation-specific chat routes, and a saved-conversation list for reopening prior threads.
- Added a deliberately empty My Map state so no reflection is saved without the user's future explicit choice.
- Moved post-onboarding appearance controls into Account while preserving and persisting the accessible theme toggle throughout onboarding.
- Made Account appearance changes update optimistically with an explicit selected state and localized saving, success, and failure feedback while retaining the prior theme if persistence fails.
- Added returning-user stage resolution so sign-in and language selection resume the appropriate onboarding step, orientation, or main Home screen.

## Remaining

- Add conversation-management details such as conversation titles and archival or deletion behavior after the core navigation is evaluated.
- Evaluate EXPLORE response quality with representative conversations before implementing RECOGNIZE.
- Implement the RECOGNIZE flow when structured signals and lived evidence warrant a Candidate Pattern.

## Known issues and open questions

- Celestine 0.2.1 calculated Pluto at 13°48′59″ Capricorn for 2015-11-30 19:33 UTC, while Kepler 7.0 and NASA/JPL Horizons agree on approximately 14°02′ Capricorn. Celestine exposes no alternate high-precision or Swiss Ephemeris mode, so replacing or supplementing the planetary ephemeris is deferred until after the prototype flow is established.
- The Prisma Postgres connection is currently shared by Production and Preview deployments. A separate preview database should be introduced before schema-changing preview deployments become routine.
- GeoNames is configured for local birthplace lookup. The same `GEONAMES_USERNAME` must remain configured in each Vercel environment that serves the onboarding flow.
- Celestine is young despite its substantial upstream tests. Keep project-owned reference fixtures and review upgrades deliberately rather than accepting automatic minor-version changes.
- Google sign-in requires `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` in local and Vercel environments before the OAuth flow can run.
- Email/password authentication is intentionally reserved for a focused security slice covering verification, recovery, rate limiting, password hashing, and safe account linking.
- EXPLORE intentionally has no canned AI fallback. It requires a configured API key with access to `OPENAI_MODEL`; failures preserve the user message and expose a retry action.
- Prisma CLI 7.10 currently brings audit findings through its bundled, unused MySQL driver and configuration merge utility. The application uses PostgreSQL, runtime packages are unaffected, and npm's suggested fix is an unsupported breaking Prisma downgrade, so it was not applied.

## Next planned slice

Manually evaluate the orientation, Home-to-EXPLORE handoff, saved-conversation navigation, and first EXPLORE conversations for clarity, tone, context use, and retry behavior. Refine observed interaction or prompt failures before adding RECOGNIZE and explicit “keep in My Map” behavior.
