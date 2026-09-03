CREATE TYPE "astrology_familiarity" AS ENUM ('new', 'basic', 'familiar', 'advanced');

CREATE TYPE "astrology_style" AS ENUM ('background', 'balanced', 'explained', 'deep');

ALTER TABLE "users"
  ADD COLUMN "astrology_familiarity" "astrology_familiarity" NOT NULL DEFAULT 'basic',
  ADD COLUMN "astrology_style" "astrology_style" NOT NULL DEFAULT 'balanced';
