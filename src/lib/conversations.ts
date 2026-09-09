import { z } from "zod";

export const conversationIdSchema = z.string().uuid();

type ExportableConversation = {
  id: string;
  focalMapItemId: string | null;
  title: string | null;
  mode: string;
  status: string;
  transitionState: string;
  transitionReferenceAt: Date | null;
  contextVersion: number | null;
  contextSnapshot: unknown;
  contextInitializedAt: Date | null;
  lastMessageAt: Date;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    mode: string;
    content: string;
    internalSignals: unknown;
    model: string | null;
    responseId: string | null;
    inReplyToId: string | null;
    createdAt: Date;
  }>;
  generationUsages: Array<{
    id: string;
    messageId: string | null;
    operation: string;
    attempt: number;
    responseId: string;
    model: string;
    responseStatus: string | null;
    conversationResponseNumber: number | null;
    inputTokens: number;
    cachedInputTokens: number;
    cacheWriteTokens: number;
    uncachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    computeUnits: number | null;
    contextSelection: unknown;
    createdAt: Date;
  }>;
};

type UsageTotals = {
  requests: number;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  uncachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

function emptyUsageTotals(): UsageTotals {
  return { requests: 0, inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, uncachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0 };
}

function addUsage(totals: UsageTotals, usage: ExportableConversation["generationUsages"][number]) {
  totals.requests += 1;
  totals.inputTokens += usage.inputTokens;
  totals.cachedInputTokens += usage.cachedInputTokens;
  totals.cacheWriteTokens += usage.cacheWriteTokens;
  totals.uncachedInputTokens += usage.uncachedInputTokens;
  totals.outputTokens += usage.outputTokens;
  totals.reasoningTokens += usage.reasoningTokens;
  totals.totalTokens += usage.totalTokens;
}

export function serializeConversationExport(conversation: ExportableConversation, exportedAt = new Date()) {
  const usageTotals = emptyUsageTotals();
  const usageByOperation: Record<string, UsageTotals> = {};
  for (const usage of conversation.generationUsages) {
    addUsage(usageTotals, usage);
    usageByOperation[usage.operation] ??= emptyUsageTotals();
    addUsage(usageByOperation[usage.operation], usage);
  }

  return {
    format: "astrocoach-conversation",
    version: 3,
    exportedAt: exportedAt.toISOString(),
    conversation: {
      id: conversation.id,
      focalMapItemId: conversation.focalMapItemId,
      title: conversation.title,
      mode: conversation.mode,
      status: conversation.status,
      transitionState: conversation.transitionState,
      transitionReferenceAt: conversation.transitionReferenceAt?.toISOString() ?? null,
      context: {
        version: conversation.contextVersion,
        initializedAt: conversation.contextInitializedAt?.toISOString() ?? null,
        snapshot: conversation.contextSnapshot,
      },
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      archivedAt: conversation.archivedAt?.toISOString() ?? null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      generationUsage: {
        totals: usageTotals,
        byOperation: usageByOperation,
        requests: conversation.generationUsages.map((usage) => ({
          id: usage.id,
          messageId: usage.messageId,
          operation: usage.operation,
          attempt: usage.attempt,
          responseId: usage.responseId,
          model: usage.model,
          responseStatus: usage.responseStatus,
          conversationResponseNumber: usage.conversationResponseNumber,
          isInitialConversationResponse: usage.conversationResponseNumber === 1,
          inputTokens: usage.inputTokens,
          cachedInputTokens: usage.cachedInputTokens,
          cacheWriteTokens: usage.cacheWriteTokens,
          uncachedInputTokens: usage.uncachedInputTokens,
          outputTokens: usage.outputTokens,
          reasoningTokens: usage.reasoningTokens,
          totalTokens: usage.totalTokens,
          computeUnits: usage.computeUnits,
          contextSelection: usage.contextSelection,
          createdAt: usage.createdAt.toISOString(),
        })),
      },
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        mode: message.mode,
        content: message.content,
        internalSignals: message.internalSignals,
        model: message.model,
        responseId: message.responseId,
        inReplyToId: message.inReplyToId,
        createdAt: message.createdAt.toISOString(),
      })),
    },
  };
}
