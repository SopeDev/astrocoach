import assert from "node:assert/strict";
import test from "node:test";
import {
  getMidheavenInterpretation,
  MIDHEAVEN_SIGNS,
  midheavenInterpretationCatalog,
} from "./midheaven-interpretations";

test("contains exactly one interpretation for every Midheaven sign", () => {
  assert.equal(midheavenInterpretationCatalog.entries.length, 12);

  for (const sign of MIDHEAVEN_SIGNS) {
    const entry = getMidheavenInterpretation(sign);
    assert.equal(entry.id, "midheaven." + sign.toLowerCase());
    assert.equal(entry.factors.sign, sign);
    assert.equal(entry.interpretation.possible_expressions.length, 3);
  }
});

test("keeps the Midheaven catalog canonical, English, and linked to the authored source", () => {
  assert.equal(midheavenInterpretationCatalog.version, 1);
  assert.equal(midheavenInterpretationCatalog.language, "en");
  assert.equal(
    midheavenInterpretationCatalog.adapted_from,
    "Libro Cosmobiología - 2014.docx",
  );
  assert.equal(midheavenInterpretationCatalog.kind, "midheaven");
});

test("keeps new interpretations symbolic rather than biographical or predictive", async () => {
  const { karmicPlanetSignInterpretationCatalog } = await import(
    "./karmic-planet-sign-interpretations"
  );
  const content = JSON.stringify([
    ...karmicPlanetSignInterpretationCatalog.entries,
    ...midheavenInterpretationCatalog.entries,
  ]);
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

test("retrieves representative Midheaven adaptations", () => {
  const gemini = getMidheavenInterpretation("Gemini");
  const pisces = getMidheavenInterpretation("Pisces");

  assert.match(gemini.interpretation.core_meaning, /communication, exchange, versatility/);
  assert.match(pisces.interpretation.developmental_direction, /practical commitments/);
});
