import assert from "node:assert/strict";
import test from "node:test";
import { conversationIdSchema, serializeConversationExport } from "./conversations";

test("requires Conversation identifiers to be UUIDs", () => {
  assert.equal(conversationIdSchema.safeParse("4f692409-3ad9-4ec6-b4de-7e251c418d45").success, true);
  assert.equal(conversationIdSchema.safeParse("not-a-conversation").success, false);
});

test("serializes persisted conversation and message metadata without profile preferences", () => {
  const exported = serializeConversationExport({
    id: "4f692409-3ad9-4ec6-b4de-7e251c418d45",
    title: "A turning point",
    mode: "RECOGNIZE",
    status: "active",
    transitionState: "ACCEPTED",
    transitionReferenceAt: new Date("2026-09-04T10:00:00.000Z"),
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
  }, new Date("2026-09-04T11:00:00.000Z"));

  assert.equal(exported.version, 1);
  assert.equal(exported.exportedAt, "2026-09-04T11:00:00.000Z");
  assert.equal(exported.conversation.messages[0].createdAt, "2026-09-04T10:02:00.000Z");
  assert.equal("astrologyFamiliarity" in exported.conversation.messages[0], false);
  assert.equal("astrologyStyle" in exported.conversation.messages[0], false);
});
