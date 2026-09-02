# Project Decisions

Last updated: 2026-09-02

## Product scope

- The product direction is governed by `astrocoach_mvp_product_guide_v0.1.md`, `astrocoach_prompt_architecture_v0.1.md`, and the initial implementation brief.
- Only EXPLORE mode is in the current implementation scope. The other documented modes remain future product direction.
- Begin EXPLORE with a fresh “What’s going on?” message while completed onboarding remains private background context rather than appearing as chat history. Persist each user message before generation, store the visible reply separately from structured internal signals, and show an explicit retry state instead of substituting a generic fallback response when chat generation fails.
- Astrology acts primarily as an internal context and inquiry engine. It must not be presented as proof about the user.
- Express that philosophy through product behavior rather than repeated user-facing disclaimers. Interface copy should use a warm, plain reflective-partner voice and lead with why each step matters personally; expose technical calculation details only when they are needed for an informed choice or error recovery.
- Keep the technical natal-chart review route hidden from the normal onboarding flow. After initial intent, combine the chart, selected life areas, and optional current context to generate provisional discovery questions that test relevance against lived experience.
- Use two-stage initial discovery: generate exactly three opening questions from chart and intent context, then exactly two finalizing questions from that context plus the first three answers. Users may revise within each stage, but generating question four closes the opening stage so adaptive follow-ups retain a stable source context.
- Birth time is optional. Houses and angles must not be calculated or presented when it is unavailable.
- Store birth dates as calendar dates and known birth times as minutes after midnight. A null birth time explicitly means unknown and must remain distinct from midnight.
- Use the MIT-licensed Celestine engine, pinned to an exact version behind a project-owned adapter, for local natal calculations without an external API. Include Chiron, and use Placidus houses and Mean Lunar Nodes for exact-time charts. For unknown-time charts, calculate planets including Chiron at local noon as an explicitly uncertain reference and omit houses, angles, nodes, and aspects.
- Retain Celestine for the prototype despite a verified Pluto longitude discrepancy of about 13 arcminutes against Kepler 7.0 and NASA/JPL Horizons for a November 2015 reference chart. Reassess the planetary ephemeris before interpretation becomes sensitive to sign boundaries, house cusps, or tight aspect orbs.
- Use Auth.js with database-backed sessions and Google OAuth as the first authentication method. Email/password authentication remains a separate future slice so registration, verification, recovery, rate limiting, and account linking can be designed together.
- Detailed high-stakes safety architecture remains deferred for the prototype.

## Application architecture

- Use the Next.js App Router with TypeScript and React Server Components by default.
- Use Tailwind CSS for styling and add shadcn/ui components selectively rather than adopting a broad component layer upfront.
- Support English and Spanish from the first onboarding flow. Locale values use stable `en` and `es` identifiers so additional languages can be added later.
- Localized product routes begin with `/{locale}`. The selected locale is stored on the user and in an HTTP-only `astrocoach-locale` cookie so server-rendered document language and navigation remain consistent before full authentication exists.
- Support system, light, and dark color themes with `next-themes`.
- Keep the theme control directly available during onboarding, and persist authenticated changes to the user profile. After onboarding, appearance is an Account setting and the shell header uses that space for the user avatar.
- AstroCoach is a mobile-first progressive web application. Every interface starts with phone ergonomics, touch targets, safe-area behavior, and standalone display constraints before adding tablet or desktop enhancements.
- Completed discovery leads through a one-time, concise product orientation and then into a Home-first application shell rather than directly into chat. The primary mobile navigation is Home, Conversations, and My Map, with Account available from the header avatar.
- Home is the starting point for a new EXPLORE conversation; Conversations reopens saved threads. My Map begins as an honest empty state and will contain only reflections the user deliberately chooses to keep once that workflow exists.
- Maintain an installable web app manifest and platform app icons. Add offline caching or push behavior only through deliberate, separately verified slices so stale application code or private user data is not cached accidentally.
- Use Prisma 7 as the ORM and migration system for PostgreSQL. During solo early development, local, preview, and production environments share the Prisma Postgres database connected through the Vercel Marketplace; split environments before broader testing or routine schema-changing previews.
- Use Prisma's PostgreSQL driver adapter. Prefer standard `DATABASE_URL` and `DIRECT_URL` names; accept the Vercel integration's generated `POSTGRES_URL` and resource-prefixed `astro_*` aliases so deployment is not coupled to manually copied secrets.
- Resolve all personal data through the authenticated Auth.js user. The seeded development identity remains fixture data only and must not be used as a runtime identity.

## External services

- Keep all external-service credentials server-only. Never expose them through `NEXT_PUBLIC_*` variables.
- Use a server-mediated external geocoder for prototype birthplace search. Preserve coordinates and an IANA timezone identifier, then resolve the historically applicable offset for the birth date and time.
- Use GeoNames for prototype populated-place search and timezone lookup. Treat its place ID as the submitted selection, re-fetch authoritative coordinates server-side, and derive the historical UTC instant locally from the returned IANA timezone.
- Use the OpenAI Responses API when conversational AI is implemented and request application-facing metadata through Structured Outputs.
- Keep the initial chat implementation stateless with respect to OpenAI: AstroCoach owns conversation history in PostgreSQL, sends the relevant recent thread on each request, and disables OpenAI response storage. Add token streaming only as a separately verified UX improvement.
- The OpenAI model is configured with `OPENAI_MODEL`. The development default is `gpt-5.6-luna`, selected as the current cost-sensitive model; it can be changed without code changes.

## Delivery

- The application is designed for Vercel deployment and uses environment-based configuration.
- Development uses npm and commits the generated lockfile.
- The user exclusively handles Git staging, commits, and pushes. The coding agent may inspect Git state but must not mutate it.
- Production builds currently use Next.js's webpack builder and the TypeScript compiler API because the development execution environment blocks Turbopack's internal localhost binding and detached TypeScript CLI process.
- Each implementation slice must leave linting, type checking, and the production build passing.
