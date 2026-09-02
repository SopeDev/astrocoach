# Project Decisions

Last updated: 2026-09-01

## Product scope

- The product direction is governed by `astrocoach_mvp_product_guide_v0.1.md`, `astrocoach_prompt_architecture_v0.1.md`, and the initial implementation brief.
- Only EXPLORE mode is in the current implementation scope. The other documented modes remain future product direction.
- Astrology acts primarily as an internal context and inquiry engine. It must not be presented as proof about the user.
- Birth time is optional. Houses and angles must not be calculated or presented when it is unavailable.
- Full authentication and detailed high-stakes safety architecture are deferred for the prototype.

## Application architecture

- Use the Next.js App Router with TypeScript and React Server Components by default.
- Use Tailwind CSS for styling and add shadcn/ui components selectively rather than adopting a broad component layer upfront.
- Support English and Spanish from the first onboarding flow. Locale values use stable `en` and `es` identifiers so additional languages can be added later.
- Support system, light, and dark color themes with `next-themes`.
- Use Prisma 7 as the ORM and migration system for PostgreSQL. Use Prisma Postgres, connected through the Vercel Marketplace, as the managed production database while retaining ordinary local PostgreSQL for development.
- Use Prisma's PostgreSQL driver adapter. Prefer standard `DATABASE_URL` and `DIRECT_URL` names; accept the Vercel integration's generated `POSTGRES_URL` and resource-prefixed `astro_*` aliases so deployment is not coupled to manually copied secrets.
- Represent the seeded development identity as a normal user row with a stable UUID. Future authentication should resolve an authenticated identity to the same user model rather than require a separate domain model.

## External services

- Keep all external-service credentials server-only. Never expose them through `NEXT_PUBLIC_*` variables.
- Use a server-mediated external geocoder for prototype birthplace search. Preserve coordinates and an IANA timezone identifier, then resolve the historically applicable offset for the birth date and time.
- Use the OpenAI Responses API when conversational AI is implemented and request application-facing metadata through Structured Outputs.
- The OpenAI model is configured with `OPENAI_MODEL`. The development default is `gpt-5.6-luna`, selected as the current cost-sensitive model; it can be changed without code changes.

## Delivery

- The application is designed for Vercel deployment and uses environment-based configuration.
- Development uses npm and commits the generated lockfile.
- Production builds currently use Next.js's webpack builder and the TypeScript compiler API because the development execution environment blocks Turbopack's internal localhost binding and detached TypeScript CLI process.
- Each implementation slice must leave linting, type checking, and the production build passing.
