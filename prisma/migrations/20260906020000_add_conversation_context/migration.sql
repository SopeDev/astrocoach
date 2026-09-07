ALTER TABLE "conversations"
  ADD COLUMN "context_version" INTEGER,
  ADD COLUMN "context_snapshot" JSONB,
  ADD COLUMN "context_initialized_at" TIMESTAMPTZ(6),
  ADD COLUMN "provider_conversation_id" TEXT;

CREATE UNIQUE INDEX "conversations_provider_conversation_id_key"
  ON "conversations"("provider_conversation_id");
