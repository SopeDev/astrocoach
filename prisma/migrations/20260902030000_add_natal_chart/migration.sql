CREATE TABLE "natal_charts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "engine" TEXT NOT NULL,
  "engine_version" TEXT NOT NULL,
  "schema_version" INTEGER NOT NULL,
  "input_hash" TEXT NOT NULL,
  "time_accuracy" TEXT NOT NULL,
  "house_system" TEXT,
  "source_profile_updated" TIMESTAMPTZ(6) NOT NULL,
  "calculated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "natal_charts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "natal_charts_time_accuracy_check" CHECK ("time_accuracy" IN ('exact', 'unknown'))
);

CREATE UNIQUE INDEX "natal_charts_user_id_key" ON "natal_charts"("user_id");

ALTER TABLE "natal_charts" ADD CONSTRAINT "natal_charts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
