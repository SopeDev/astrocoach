import assert from "node:assert/strict";
import test from "node:test";
import {
  assertHumanFirstAstrologyLanguage,
  DISCOVERY_QUESTION_STYLE_INSTRUCTIONS,
  findTechnicalAstrologyLanguage,
  HUMAN_FIRST_ASTROLOGY_INSTRUCTIONS,
  TechnicalAstrologyLanguageError,
} from "./human-first-astrology";

test("accepts person-facing language that expresses the meaning without astrology jargon", () => {
  assert.deepEqual(findTechnicalAstrologyLanguage([
    "You may work hard to keep the peace, even when part of you wants to be more direct.",
    "Where do you notice that most lately?",
  ]), []);
  assert.doesNotThrow(() => assertHumanFirstAstrologyLanguage([
    "A strength hidden in tension",
  ]));
});

test("detects technical astrology and aspect geometry in visible English and Spanish", () => {
  const terms = findTechnicalAstrologyLanguage([
    "Your Sun–Mars opposition is applying within 0.8°.",
    "Marte en cuadratura con el Ascendente y el Nodo Norte en la octava casa.",
  ]);

  assert.ok(terms.includes("planet or chart-point name"));
  assert.ok(terms.includes("aspect terminology"));
  assert.ok(terms.includes("angle or house terminology"));
  assert.ok(terms.includes("aspect measurement"));
  assert.throws(
    () => assertHumanFirstAstrologyLanguage(["Mercury sextile Saturn"]),
    TechnicalAstrologyLanguageError,
  );
});

test("defines technical-free visible copy as an explicit generation invariant", () => {
  assert.match(HUMAN_FIRST_ASTROLOGY_INSTRUCTIONS, /works backstage/i);
  assert.match(HUMAN_FIRST_ASTROLOGY_INSTRUCTIONS, /must not name planets, signs, houses, aspects/i);
  assert.match(HUMAN_FIRST_ASTROLOGY_INSTRUCTIONS, /private provenance/i);
  assert.match(DISCOVERY_QUESTION_STYLE_INSTRUCTIONS, /perceptive close friend/i);
  assert.match(DISCOVERY_QUESTION_STYLE_INSTRUCTIONS, /confirm it, correct it/i);
  assert.match(DISCOVERY_QUESTION_STYLE_INSTRUCTIONS, /avoid answer menus/i);
});
