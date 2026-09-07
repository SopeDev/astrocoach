import "server-only";

import OpenAI from "openai";
import type { Responses } from "openai/resources/responses/responses";
import { getServerEnv } from "@/lib/env";
import { boundedConversationHistory } from "@/lib/conversation-limits";
import {
  providerConversationSeedItems,
  providerHistoryItems,
  type ConversationContextSnapshot,
} from "@/lib/conversation-context";

const PROVIDER_ITEM_BATCH_SIZE = 20;

function client() {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export async function createProviderConversation({
  appConversationId,
  snapshot,
  history,
}: {
  appConversationId: string;
  snapshot: ConversationContextSnapshot;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const openai = client();
  const conversation = await openai.conversations.create({
    items: providerConversationSeedItems(snapshot),
    metadata: {
      application: "astrocoach",
      app_conversation_id: appConversationId,
      context_version: String(snapshot.schemaVersion),
    },
  });
  const historicalItems = providerHistoryItems(
    boundedConversationHistory(history),
  ) as Responses.ResponseInputItem[];
  for (let index = 0; index < historicalItems.length; index += PROVIDER_ITEM_BATCH_SIZE) {
    await openai.conversations.items.create(conversation.id, {
      items: historicalItems.slice(index, index + PROVIDER_ITEM_BATCH_SIZE),
    });
  }
  return conversation.id;
}

export async function deleteProviderConversation(providerConversationId: string) {
  const openai = client();
  const items = [];
  for await (const item of openai.conversations.items.list(providerConversationId, { limit: 100 })) {
    if (item.id) items.push(item.id);
  }
  for (const itemId of items) {
    await openai.conversations.items.delete(itemId, {
      conversation_id: providerConversationId,
    });
  }
  await openai.conversations.delete(providerConversationId);
}
