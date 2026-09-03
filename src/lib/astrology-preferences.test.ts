import assert from "node:assert/strict";
import test from "node:test";
import {
  astrologyFamiliaritySchema,
  astrologyStyleSchema,
  DEFAULT_ASTROLOGY_FAMILIARITY,
  DEFAULT_ASTROLOGY_STYLE,
} from "./astrology-preferences";

test("astrology preference defaults keep familiarity and visibility independent", () => {
  assert.equal(DEFAULT_ASTROLOGY_FAMILIARITY, "basic");
  assert.equal(DEFAULT_ASTROLOGY_STYLE, "balanced");
  assert.equal(astrologyFamiliaritySchema.safeParse("advanced").success, true);
  assert.equal(astrologyStyleSchema.safeParse("background").success, true);
});

test("astrology preference validation rejects unknown values", () => {
  assert.equal(astrologyFamiliaritySchema.safeParse("deep").success, false);
  assert.equal(astrologyStyleSchema.safeParse("often").success, false);
});
