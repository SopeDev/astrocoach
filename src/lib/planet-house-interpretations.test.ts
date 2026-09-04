import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlanetHouseInterpretation,
  PLANET_HOUSE_HOUSES,
  PLANET_HOUSE_PLANETS,
  planetHouseInterpretationCatalog,
} from "./planet-house-interpretations";

test("contains exactly one interpretation for every supported planet-house combination", () => {
  assert.equal(planetHouseInterpretationCatalog.entries.length, 120);

  for (const planet of PLANET_HOUSE_PLANETS) {
    for (const house of PLANET_HOUSE_HOUSES) {
      const entry = getPlanetHouseInterpretation(planet, house);
      assert.equal(entry.factors.planet, planet);
      assert.equal(entry.factors.house, house);
      assert.equal(entry.interpretation.possible_expressions.length, 3);
    }
  }
});

test("keeps the planet-house catalog canonical, English, and linked to the authored source", () => {
  assert.equal(planetHouseInterpretationCatalog.version, 1);
  assert.equal(planetHouseInterpretationCatalog.language, "en");
  assert.equal(planetHouseInterpretationCatalog.adapted_from, "Libro Cosmobiología - 2014.docx");
  assert.equal(planetHouseInterpretationCatalog.kind, "planet_house");
});

test("avoids deterministic biographical and high-stakes claims in both new catalogs", async () => {
  const { ascendantInterpretationCatalog } = await import("./ascendant-interpretations");
  const content = JSON.stringify([
    ...ascendantInterpretationCatalog.entries,
    ...planetHouseInterpretationCatalog.entries,
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

test("retrieves representative personal and transpersonal planet-house adaptations", () => {
  const marsSeventh = getPlanetHouseInterpretation("Mars", 7);
  const neptuneTwelfth = getPlanetHouseInterpretation("Neptune", 12);

  assert.equal(marsSeventh.id, "planet_house.mars.7");
  assert.match(marsSeventh.interpretation.core_meaning, /partnership, negotiation/);
  assert.equal(neptuneTwelfth.id, "planet_house.neptune.12");
  assert.match(neptuneTwelfth.interpretation.developmental_direction, /compassionate awareness/);
});
