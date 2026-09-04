import assert from "node:assert/strict";
import test from "node:test";
import { patternIdSchema, patternStatementSchema } from "./patterns";

test("validates editable Pattern statements", () => {
  assert.equal(patternStatementSchema.parse("  I pause when uncertainty rises.  "), "I pause when uncertainty rises.");
  assert.equal(patternStatementSchema.safeParse("").success, false);
  assert.equal(patternStatementSchema.safeParse("x".repeat(501)).success, false);
});

test("requires Pattern identifiers to be UUIDs", () => {
  assert.equal(patternIdSchema.safeParse("4f692409-3ad9-4ec6-b4de-7e251c418d45").success, true);
  assert.equal(patternIdSchema.safeParse("not-a-pattern").success, false);
});
