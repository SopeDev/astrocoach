import assert from "node:assert/strict";
import test from "node:test";
import { conversationIdSchema, serializeConversationExport } from "./conversations";

test("requires Conversation identifiers to be UUIDs", () => {
  assert.equal(conversationIdSchema.safeParse("4f692409-3ad9-4ec6-b4de-7e251c418d45").success, true);
  assert.equal(conversationIdSchema.safeParse("not-a-conversation").success, false);
});

test("serializes the conversation context snapshot without copying preferences onto messages", () => {
  const exported = serializeConversationExport({
    id: "4f692409-3ad9-4ec6-b4de-7e251c418d45",
    focalMapItemId: "41400a88-6dd5-4480-a2f5-f75fae813c5c",
    title: "A turning point",
    mode: "RECOGNIZE",
    status: "active",
    transitionState: "ACCEPTED",
    transitionReferenceAt: new Date("2026-09-04T10:00:00.000Z"),
    contextVersion: 1,
    contextSnapshot: { birth: { date: "2000-01-01" } },
    contextInitializedAt: new Date("2026-09-04T10:00:01.000Z"),
    lastMessageAt: new Date("2026-09-04T10:02:00.000Z"),
    archivedAt: null,
    createdAt: new Date("2026-09-04T10:00:00.000Z"),
    updatedAt: new Date("2026-09-04T10:02:00.000Z"),
    messages: [{
      id: "960e4d38-049e-45ce-9ad9-08bc437f0a9a",
      role: "assistant",
      mode: "RECOGNIZE",
      content: "A possible pattern",
      internalSignals: { evidenceStrength: "moderate" },
      model: "test-model",
      responseId: "response-1",
      inReplyToId: "bb594dc5-acf1-45f4-a003-02e33bb9122e",
      createdAt: new Date("2026-09-04T10:02:00.000Z"),
    }],
    generationUsages: [{
      id: "14f299d5-73d6-4ce7-ab4c-580e4e24c708",
      messageId: "bb594dc5-acf1-45f4-a003-02e33bb9122e",
      operation: "CHAT_RECOGNIZE",
      attempt: 1,
      responseId: "response-1",
      model: "test-model",
      responseStatus: "completed",
      conversationResponseNumber: 1,
      inputTokens: 1000,
      cachedInputTokens: 600,
      cacheWriteTokens: 0,
      uncachedInputTokens: 400,
      outputTokens: 100,
      reasoningTokens: 25,
      totalTokens: 1100,
      computeUnits: null,
      contextSelection: {
        selectedFactors: 2,
        maxFactors: 4,
        factorSelections: [{ id: "placement.saturn", score: 8, reasons: ["recent_continuity"] }],
      },
      createdAt: new Date("2026-09-04T10:01:59.000Z"),
    }],
  }, new Date("2026-09-04T11:00:00.000Z"));

  assert.equal(exported.version, 3);
  assert.equal(exported.exportedAt, "2026-09-04T11:00:00.000Z");
  assert.equal(exported.conversation.context.version, 1);
  assert.equal(exported.conversation.focalMapItemId, "41400a88-6dd5-4480-a2f5-f75fae813c5c");
  assert.deepEqual(exported.conversation.context.snapshot, { birth: { date: "2000-01-01" } });
  assert.equal(exported.conversation.messages[0].createdAt, "2026-09-04T10:02:00.000Z");
  assert.equal("astrologyFamiliarity" in exported.conversation.messages[0], false);
  assert.equal("astrologyStyle" in exported.conversation.messages[0], false);
  assert.equal(exported.conversation.generationUsage.totals.totalTokens, 1100);
  assert.equal(exported.conversation.generationUsage.totals.cachedInputTokens, 600);
  assert.equal(exported.conversation.generationUsage.byOperation.CHAT_RECOGNIZE.requests, 1);
  assert.equal(exported.conversation.generationUsage.requests[0].isInitialConversationResponse, true);
  assert.equal((exported.conversation.generationUsage.requests[0].contextSelection as { selectedFactors: number }).selectedFactors, 2);
  assert.equal("providerConversationId" in exported.conversation.generationUsage.requests[0], false);
});
