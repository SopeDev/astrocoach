import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlanetSignInterpretation,
  PLANET_SIGN_PLANETS,
  PLANET_SIGN_SIGNS,
  planetSignInterpretationCatalog,
} from "./planet-sign-interpretations";

test("contains exactly one interpretation for every supported planet-sign combination", () => {
  assert.equal(planetSignInterpretationCatalog.entries.length, 120);

  for (const planet of PLANET_SIGN_PLANETS) {
    for (const sign of PLANET_SIGN_SIGNS) {
      const entry = getPlanetSignInterpretation(planet, sign);
      assert.equal(entry.factors.planet, planet);
      assert.equal(entry.factors.sign, sign);
      assert.equal(entry.interpretation.possible_expressions.length, 3);
    }
  }
});

test("keeps the catalog canonical, English, and linked to the authored source", () => {
  assert.equal(planetSignInterpretationCatalog.version, 1);
  assert.equal(planetSignInterpretationCatalog.language, "en");
  assert.equal(planetSignInterpretationCatalog.adapted_from, "Libro Cosmobiología - 2014.docx");
  assert.equal(planetSignInterpretationCatalog.kind, "planet_sign");
});

test("avoids deterministic biographical and high-stakes claims in runtime copy", () => {
  const content = JSON.stringify(planetSignInterpretationCatalog.entries);
  const prohibitedClaims = [
    /\byou will\b/i,
    /\bis destined\b/i,
    /\bwill marry\b/i,
    /\bguarantees?\b/i,
    /\bpast li(?:fe|ves)\b/i,
    /\bdiagnos(?:e|is|ed)\b/i,
    /\bsuicid(?:e|al)\b/i,
    /\bcauses? (?:illness|disease)\b/i,
  ];

  for (const claim of prohibitedClaims) assert.doesNotMatch(content, claim);
});

test("retrieves the reviewed Venus in Capricorn adaptation", () => {
  const entry = getPlanetSignInterpretation("Venus", "Capricorn");

  assert.equal(entry.id, "planet_sign.venus.capricorn");
  assert.match(entry.interpretation.core_meaning, /consistency, responsibility/);
  assert.match(entry.interpretation.developmental_direction, /vulnerability/);
});
