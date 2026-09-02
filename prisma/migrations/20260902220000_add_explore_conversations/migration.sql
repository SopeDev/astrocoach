CREATE TYPE "conversation_mode" AS ENUM ('EXPLORE');
CREATE TYPE "conversation_status" AS ENUM ('active', 'paused', 'closed');
CREATE TYPE "message_role" AS ENUM ('user', 'assistant');

CREATE TABLE "conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "mode" "conversation_mode" NOT NULL DEFAULT 'EXPLORE',
  "status" "conversation_status" NOT NULL DEFAULT 'active',
  "title" VARCHAR(120),
  "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL,
  "role" "message_role" NOT NULL,
  "content" TEXT NOT NULL,
  "internal_signals" JSONB,
  "model" TEXT,
  "response_id" TEXT,
  "in_reply_to_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversations_user_id_last_message_at_idx" ON "conversations"("user_id", "last_message_at" DESC);
CREATE UNIQUE INDEX "messages_in_reply_to_id_key" ON "messages"("in_reply_to_id");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_in_reply_to_id_fkey" FOREIGN KEY ("in_reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
