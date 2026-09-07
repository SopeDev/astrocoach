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
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /works backstage/i);
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /NEVER use astrological terminology/i);
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /what the person might recognize in life/i);
});

test("the interpretation schema invalidates themes that claimed unknown-time aspects were omitted", () => {
  assert.equal(NATAL_INTERPRETATION_SCHEMA_VERSION, 7);
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /exact body pair, type, orb metadata, timing reliability/i);
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /use.*internally/i);
  assert.match(NATAL_THEME_GENERATION_INSTRUCTIONS, /only aspects stable across the sampled local day/i);
});
