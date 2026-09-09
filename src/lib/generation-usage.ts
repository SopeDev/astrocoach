import "server-only";

import type { Responses } from "openai/resources/responses/responses";
import { db } from "@/db/client";

export const GENERATION_OPERATIONS = [
  "NATAL_THEMES",
  "DISCOVERY_INITIAL",
  "DISCOVERY_FINAL",
  "CHAT_EXPLORE",
  "CHAT_RECOGNIZE",
  "CHAT_DEEP_EXPLORE",
  "CHAT_INTEGRATE",
] as const;

export type GenerationOperation = (typeof GENERATION_OPERATIONS)[number];

export type GenerationUsageContext = {
  userId: string;
  operation: GenerationOperation;
  attempt?: number;
  conversationId?: string | null;
  messageId?: string | null;
  providerConversationId?: string | null;
  conversationResponseNumber?: number | null;
};

export async function recordGenerationUsage(
  response: Pick<Responses.Response, "id" | "model" | "status" | "usage">,
  context: GenerationUsageContext,
) {
  const usage = response.usage;
  if (!usage) return;
  const cachedInputTokens = usage.input_tokens_details.cached_tokens;
  try {
    await db.generationUsage.upsert({
      where: { responseId: response.id },
      create: {
        userId: context.userId,
        conversationId: context.conversationId,
        messageId: context.messageId,
        operation: context.operation,
        attempt: context.attempt ?? 1,
        responseId: response.id,
        providerConversationId: context.providerConversationId,
        conversationResponseNumber: context.conversationResponseNumber,
        model: response.model,
        responseStatus: response.status,
        inputTokens: usage.input_tokens,
        cachedInputTokens,
        cacheWriteTokens: usage.input_tokens_details.cache_write_tokens,
        uncachedInputTokens: Math.max(0, usage.input_tokens - cachedInputTokens),
        outputTokens: usage.output_tokens,
        reasoningTokens: usage.output_tokens_details.reasoning_tokens,
        totalTokens: usage.total_tokens,
        computeUnits: usage.compute_units,
      },
      update: {},
    });
  } catch (error) {
    console.warn("Could not persist OpenAI generation usage", error);
  }
}
