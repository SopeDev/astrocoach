import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ASSISTANT_MESSAGES_PER_CONVERSATION,
  MAX_USER_MESSAGES_PER_CONVERSATION,
  MAX_VISIBLE_MESSAGES_PER_CONVERSATION,
  boundedConversationHistory,
  canAddAssistantMessage,
  canAddUserMessage,
  countConversationMessages,
  hasReachedConversationLimit,
} from "./conversation-limits";

test("allows no more than fifteen messages from either participant", () => {
  assert.equal(MAX_USER_MESSAGES_PER_CONVERSATION, 15);
  assert.equal(MAX_ASSISTANT_MESSAGES_PER_CONVERSATION, 15);
  assert.equal(MAX_VISIBLE_MESSAGES_PER_CONVERSATION, 30);
  assert.equal(canAddUserMessage({ user: 14, assistant: 14 }), true);
  assert.equal(canAddUserMessage({ user: 15, assistant: 14 }), false);
  assert.equal(canAddUserMessage({ user: 14, assistant: 15 }), false);
  assert.equal(canAddAssistantMessage({ user: 15, assistant: 14 }), true);
  assert.equal(canAddAssistantMessage({ user: 14, assistant: 15 }), false);
  assert.equal(hasReachedConversationLimit({ user: 15, assistant: 14 }), true);
});

test("counts visible messages by role", () => {
  assert.deepEqual(countConversationMessages([
    { role: "user" },
    { role: "assistant" },
    { role: "assistant" },
  ]), { user: 1, assistant: 2 });
});

test("legacy provider backfill retains at most the newest fifteen messages per role", () => {
  const history = Array.from({ length: 40 }, (_, index) => ({
    id: index,
    role: index % 2 === 0 ? "user" as const : "assistant" as const,
  }));
  const retained = boundedConversationHistory(history);
  assert.equal(retained.length, 30);
  assert.deepEqual(countConversationMessages(retained), { user: 15, assistant: 15 });
  assert.equal(retained[0].id, 10);
  assert.equal(retained.at(-1)?.id, 39);
});
