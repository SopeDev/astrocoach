-- Generalize recognized Patterns into typed Map items while preserving all rows and identifiers.
CREATE TYPE "map_item_kind" AS ENUM ('PATTERN', 'INSIGHT');
CREATE TYPE "practice_purpose" AS ENUM ('NOTICE_EARLIER', 'CREATE_SPACE', 'CHECK_INTENTION', 'CHOOSE_CONSCIOUSLY', 'LEARN_AFTER');
CREATE TYPE "practice_primitive" AS ENUM ('NAME_CUE', 'PAUSE', 'ASK_ONE_QUESTION', 'MAKE_ONE_CHOICE', 'NOTE_AFTERWARD');
CREATE TYPE "practice_status" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

ALTER TYPE "conversation_mode" ADD VALUE 'INTEGRATE';

ALTER TABLE "patterns" RENAME TO "map_items";
ALTER TABLE "map_items" RENAME CONSTRAINT "patterns_pkey" TO "map_items_pkey";
ALTER TABLE "map_items" RENAME CONSTRAINT "patterns_user_id_fkey" TO "map_items_user_id_fkey";
ALTER TABLE "map_items" RENAME CONSTRAINT "patterns_conversation_id_fkey" TO "map_items_conversation_id_fkey";
ALTER TABLE "map_items" RENAME CONSTRAINT "patterns_source_message_id_fkey" TO "map_items_source_message_id_fkey";
ALTER INDEX "patterns_source_message_id_key" RENAME TO "map_items_source_message_id_key";
ALTER INDEX "patterns_user_id_created_at_idx" RENAME TO "map_items_user_id_created_at_idx";
ALTER INDEX "patterns_user_id_archived_at_created_at_idx" RENAME TO "map_items_user_id_archived_at_created_at_idx";
ALTER TABLE "map_items" ADD COLUMN "kind" "map_item_kind" NOT NULL DEFAULT 'PATTERN';

ALTER TABLE "conversations" ADD COLUMN "focal_map_item_id" UUID;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_focal_map_item_id_fkey"
  FOREIGN KEY ("focal_map_item_id") REFERENCES "map_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "conversations_focal_map_item_id_idx" ON "conversations"("focal_map_item_id");
CREATE INDEX "map_items_user_id_kind_archived_at_created_at_idx" ON "map_items"("user_id", "kind", "archived_at", "created_at" DESC);

CREATE TABLE "practices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "map_item_id" UUID NOT NULL,
  "conversation_id" UUID,
  "source_message_id" UUID,
  "intention" TEXT NOT NULL,
  "purpose" "practice_purpose" NOT NULL,
  "primitive" "practice_primitive" NOT NULL,
  "instruction" TEXT NOT NULL,
  "cue" TEXT NOT NULL,
  "status" "practice_status" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "practices_source_message_id_key" ON "practices"("source_message_id");
CREATE UNIQUE INDEX "practices_one_active_per_map_item_key" ON "practices"("user_id", "map_item_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "practices_user_id_status_created_at_idx" ON "practices"("user_id", "status", "created_at" DESC);
CREATE INDEX "practices_map_item_id_status_idx" ON "practices"("map_item_id", "status");
ALTER TABLE "practices" ADD CONSTRAINT "practices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practices" ADD CONSTRAINT "practices_map_item_id_fkey" FOREIGN KEY ("map_item_id") REFERENCES "map_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practices" ADD CONSTRAINT "practices_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "practices" ADD CONSTRAINT "practices_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "practice_observations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "practice_id" UUID NOT NULL,
  "conversation_id" UUID,
  "source_message_id" UUID,
  "content" TEXT NOT NULL,
  "learning" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "practice_observations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "practice_observations_source_message_id_key" ON "practice_observations"("source_message_id");
CREATE INDEX "practice_observations_practice_id_created_at_idx" ON "practice_observations"("practice_id", "created_at" DESC);
CREATE INDEX "practice_observations_user_id_created_at_idx" ON "practice_observations"("user_id", "created_at" DESC);
ALTER TABLE "practice_observations" ADD CONSTRAINT "practice_observations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_observations" ADD CONSTRAINT "practice_observations_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_observations" ADD CONSTRAINT "practice_observations_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "practice_observations" ADD CONSTRAINT "practice_observations_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
