import assert from "node:assert/strict";
import test from "node:test";
import { conversationIdSchema } from "./conversations";

test("requires Conversation identifiers to be UUIDs", () => {
  assert.equal(conversationIdSchema.safeParse("4f692409-3ad9-4ec6-b4de-7e251c418d45").success, true);
  assert.equal(conversationIdSchema.safeParse("not-a-conversation").success, false);
});
