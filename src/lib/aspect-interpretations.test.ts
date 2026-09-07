import assert from "node:assert/strict";
import test from "node:test";
import {
  aspectInterpretationCatalog,
  getAspectInterpretation,
  MAJOR_ASPECT_TYPES,
} from "./aspect-interpretations";

test("major aspect catalog has exhaustive authored coverage", () => {
  assert.equal(aspectInterpretationCatalog.entries.length, MAJOR_ASPECT_TYPES.length);
  for (const type of MAJOR_ASPECT_TYPES) {
    const entry = getAspectInterpretation(type);
    assert.equal(entry.id, `aspect.${type}`);
    assert.ok(entry.interpretation.core_meaning.length > 0);
    assert.equal(entry.interpretation.possible_expressions.length, 3);
  }
});
