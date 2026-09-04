ALTER TABLE "conversations" ADD COLUMN "archived_at" TIMESTAMPTZ(6);

CREATE INDEX "conversations_user_id_archived_at_last_message_at_idx"
ON "conversations"("user_id", "archived_at", "last_message_at" DESC);
