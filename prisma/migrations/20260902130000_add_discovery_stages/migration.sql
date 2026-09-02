ALTER TABLE "initial_intents"
  ADD COLUMN "initial_answers" JSONB,
  ADD COLUMN "final_questions" JSONB,
  ADD COLUMN "final_answers" JSONB,
  ADD COLUMN "discovery_completed_at" TIMESTAMPTZ(6);
