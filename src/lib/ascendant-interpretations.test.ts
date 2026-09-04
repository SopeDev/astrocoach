import assert from "node:assert/strict";
import test from "node:test";
import {
  ASCENDANT_SIGNS,
  ascendantInterpretationCatalog,
  getAscendantInterpretation,
} from "./ascendant-interpretations";

test("contains exactly one interpretation for every Ascendant sign", () => {
  assert.equal(ascendantInterpretationCatalog.entries.length, 12);

  for (const sign of ASCENDANT_SIGNS) {
    const entry = getAscendantInterpretation(sign);
    assert.equal(entry.id, `ascendant.${sign.toLowerCase()}`);
    assert.equal(entry.factors.sign, sign);
    assert.equal(entry.interpretation.possible_expressions.length, 3);
  }
});

test("keeps the Ascendant catalog canonical, English, and linked to the authored source", () => {
  assert.equal(ascendantInterpretationCatalog.version, 1);
  assert.equal(ascendantInterpretationCatalog.language, "en");
  assert.equal(ascendantInterpretationCatalog.adapted_from, "Libro Cosmobiología - 2014.docx");
  assert.equal(ascendantInterpretationCatalog.kind, "ascendant");
});

test("retrieves the adapted Libra Ascendant interpretation", () => {
  const entry = getAscendantInterpretation("Libra");

  assert.match(entry.interpretation.core_meaning, /relationship, proportion/);
  assert.match(entry.interpretation.developmental_direction, /honest difference/);
});
