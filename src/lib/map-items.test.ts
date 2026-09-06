import assert from "node:assert/strict";
import test from "node:test";
import { mapItemIdSchema, mapItemKindSchema, mapItemStatementSchema } from "./map-items";

test("validates editable Map item statements", () => {
  assert.equal(mapItemStatementSchema.parse("  I pause when uncertainty rises.  "), "I pause when uncertainty rises.");
  assert.equal(mapItemStatementSchema.safeParse("").success, false);
  assert.equal(mapItemStatementSchema.safeParse("x".repeat(501)).success, false);
});

test("validates Map item identifiers and kinds", () => {
  assert.equal(mapItemIdSchema.safeParse("4f692409-3ad9-4ec6-b4de-7e251c418d45").success, true);
  assert.equal(mapItemIdSchema.safeParse("not-a-map-item").success, false);
  assert.equal(mapItemKindSchema.safeParse("PATTERN").success, true);
  assert.equal(mapItemKindSchema.safeParse("INSIGHT").success, true);
});
