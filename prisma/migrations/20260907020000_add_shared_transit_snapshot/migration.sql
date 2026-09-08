CREATE TABLE "transit_snapshots" (
  "id" VARCHAR(32) NOT NULL,
  "schema_version" INTEGER NOT NULL,
  "engine_version" TEXT NOT NULL,
  "calculated_at" TIMESTAMPTZ(6) NOT NULL,
  "data" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "transit_snapshots_pkey" PRIMARY KEY ("id")
);
