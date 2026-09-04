import assert from "node:assert/strict";
import test from "node:test";
import {
  ARCHETYPE_HOUSES,
  ARCHETYPE_PLANETS,
  ARCHETYPE_SIGNS,
  getHouseArchetype,
  getPlanetArchetype,
  getSignArchetype,
  houseArchetypeCatalog,
  planetArchetypeCatalog,
  signArchetypeCatalog,
} from "./archetype-interpretations";

test("contains exactly one archetype for every supported planet, sign, and house", () => {
  assert.equal(planetArchetypeCatalog.entries.length, 11);
  assert.equal(signArchetypeCatalog.entries.length, 12);
  assert.equal(houseArchetypeCatalog.entries.length, 12);

  for (const planet of ARCHETYPE_PLANETS) {
    const entry = getPlanetArchetype(planet);
    assert.equal(entry.factors.planet, planet);
    assert.equal(entry.interpretation.possible_expressions.length, 3);
  }

  for (const sign of ARCHETYPE_SIGNS) {
    const entry = getSignArchetype(sign);
    assert.equal(entry.factors.sign, sign);
    assert.equal(entry.interpretation.possible_expressions.length, 3);
  }

  for (const house of ARCHETYPE_HOUSES) {
    const entry = getHouseArchetype(house);
    assert.equal(entry.factors.house, house);
    assert.equal(entry.interpretation.possible_expressions.length, 3);
  }
});

test("keeps every archetype catalog canonical, English, and linked to the authored source", () => {
  for (const catalog of [
    planetArchetypeCatalog,
    signArchetypeCatalog,
    houseArchetypeCatalog,
  ]) {
    assert.equal(catalog.version, 1);
    assert.equal(catalog.language, "en");
    assert.equal(catalog.adapted_from, "Libro Cosmobiología - 2014.docx");
  }
});

test("avoids deterministic biographical and high-stakes claims in runtime copy", () => {
  const content = JSON.stringify([
    ...planetArchetypeCatalog.entries,
    ...signArchetypeCatalog.entries,
    ...houseArchetypeCatalog.entries,
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

test("retrieves representative planet, sign, and house archetypes", () => {
  assert.match(getPlanetArchetype("Chiron").interpretation.core_meaning, /vulnerability/);
  assert.match(getSignArchetype("Scorpio").interpretation.core_meaning, /transformative/);
  assert.match(getHouseArchetype(12).interpretation.core_meaning, /inner life/);
});
