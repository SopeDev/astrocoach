import assert from "node:assert/strict";
import test from "node:test";
import { ASTROCOACH_GENERATED_CONTENT_STYLE_INSTRUCTIONS } from "./astrology-context";
import { NATAL_THEME_GENERATION_INSTRUCTIONS } from "./natal-interpretation-prompt";
import { NATAL_INTERPRETATION_SCHEMA_VERSION } from "./natal-interpretation";

test("chart theme generation uses the shared product voice and concrete readability constraints", () => {
  assert.ok(NATAL_THEME_GENERATION_INSTRUCTIONS.includes(ASTROCOACH_GENERATED_CONTENT_STYLE_INSTRUCTIONS));
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /two or three short sentences/i);
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /ordinary life/i);
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /provide meaning, not voice/i);
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /equally natural, casual Spanish/i);
});

test("the interpretation schema invalidates themes generated before the voice update", () => {
  assert.equal(NATAL_INTERPRETATION_SCHEMA_VERSION, 4);
});
