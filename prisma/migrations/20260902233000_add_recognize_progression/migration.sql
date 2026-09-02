ALTER TYPE "conversation_mode" ADD VALUE 'RECOGNIZE';

CREATE TYPE "conversation_transition_state" AS ENUM ('IDLE', 'OFFERED', 'DISMISSED');

ALTER TABLE "conversations"
  ADD COLUMN "transition_state" "conversation_transition_state" NOT NULL DEFAULT 'IDLE',
  ADD COLUMN "transition_reference_at" TIMESTAMPTZ(6);

ALTER TABLE "messages"
  ADD COLUMN "mode" "conversation_mode" NOT NULL DEFAULT 'EXPLORE';

CREATE TABLE "patterns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "conversation_id" UUID,
  "source_message_id" UUID,
  "statement" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "patterns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patterns_source_message_id_key" ON "patterns"("source_message_id");
CREATE INDEX "patterns_user_id_created_at_idx" ON "patterns"("user_id", "created_at" DESC);

ALTER TABLE "patterns"
  ADD CONSTRAINT "patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "patterns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "patterns_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
