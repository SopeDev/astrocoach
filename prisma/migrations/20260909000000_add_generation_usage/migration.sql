CREATE TABLE "generation_usages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "conversation_id" UUID,
    "message_id" UUID,
    "operation" VARCHAR(40) NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "response_id" TEXT NOT NULL,
    "provider_conversation_id" TEXT,
    "conversation_response_number" INTEGER,
    "model" TEXT NOT NULL,
    "response_status" TEXT,
    "input_tokens" INTEGER NOT NULL,
    "cached_input_tokens" INTEGER NOT NULL,
    "cache_write_tokens" INTEGER NOT NULL,
    "uncached_input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "reasoning_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "compute_units" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generation_usages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "generation_usages_response_id_key" ON "generation_usages"("response_id");
CREATE INDEX "generation_usages_user_id_created_at_idx" ON "generation_usages"("user_id", "created_at" DESC);
CREATE INDEX "generation_usages_conversation_id_created_at_idx" ON "generation_usages"("conversation_id", "created_at" DESC);
CREATE INDEX "generation_usages_operation_created_at_idx" ON "generation_usages"("operation", "created_at" DESC);
ALTER TABLE "generation_usages" ADD CONSTRAINT "generation_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "generation_usages" ADD CONSTRAINT "generation_usages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "generation_usages" ADD CONSTRAINT "generation_usages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
