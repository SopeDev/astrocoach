CREATE TABLE "initial_intents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "life_areas" TEXT[] NOT NULL,
  "current_context" TEXT,
  "discovery_questions" JSONB,
  "questions_generated_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "initial_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "initial_intents_user_id_key" ON "initial_intents"("user_id");

ALTER TABLE "initial_intents" ADD CONSTRAINT "initial_intents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
