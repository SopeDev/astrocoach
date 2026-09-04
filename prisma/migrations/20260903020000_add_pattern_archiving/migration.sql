ALTER TABLE "patterns" ADD COLUMN "archived_at" TIMESTAMPTZ(6);

CREATE INDEX "patterns_user_id_archived_at_created_at_idx"
ON "patterns"("user_id", "archived_at", "created_at" DESC);
