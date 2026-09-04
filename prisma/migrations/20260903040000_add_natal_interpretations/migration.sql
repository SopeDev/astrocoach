CREATE TABLE "natal_interpretations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "natal_chart_id" UUID NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "source_chart_input_hash" TEXT NOT NULL,
    "generation_method" TEXT NOT NULL,
    "model" TEXT,
    "data" JSONB NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "natal_interpretations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "natal_interpretations_user_id_key" ON "natal_interpretations"("user_id");
CREATE UNIQUE INDEX "natal_interpretations_natal_chart_id_key" ON "natal_interpretations"("natal_chart_id");

ALTER TABLE "natal_interpretations"
ADD CONSTRAINT "natal_interpretations_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "natal_interpretations"
ADD CONSTRAINT "natal_interpretations_natal_chart_id_fkey"
FOREIGN KEY ("natal_chart_id") REFERENCES "natal_charts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
