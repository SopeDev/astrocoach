import assert from "node:assert/strict";
import test from "node:test";
import {
  getKarmicPlanetSignInterpretation,
  KARMIC_PLANET_SIGN_PLANETS,
  KARMIC_PLANET_SIGN_SIGNS,
  karmicPlanetSignInterpretationCatalog,
} from "./karmic-planet-sign-interpretations";

test("contains exactly one karmic interpretation for Moon and Saturn in every sign", () => {
  assert.equal(karmicPlanetSignInterpretationCatalog.entries.length, 24);

  for (const planet of KARMIC_PLANET_SIGN_PLANETS) {
    for (const sign of KARMIC_PLANET_SIGN_SIGNS) {
      const entry = getKarmicPlanetSignInterpretation(planet, sign);
      const expectedId = [
        "karmic_planet_sign",
        planet.toLowerCase(),
        sign.toLowerCase(),
      ].join(".");
      assert.equal(entry.id, expectedId);
      assert.equal(entry.lens, "karmic");
      assert.equal(entry.factors.planet, planet);
      assert.equal(entry.factors.sign, sign);
      assert.equal(entry.interpretation.possible_expressions.length, 3);
    }
  }
});

test("keeps the karmic catalog canonical, English, and linked to the authored source", () => {
  assert.equal(karmicPlanetSignInterpretationCatalog.version, 1);
  assert.equal(karmicPlanetSignInterpretationCatalog.language, "en");
  assert.equal(
    karmicPlanetSignInterpretationCatalog.adapted_from,
    "Libro Cosmobiología - 2014.docx",
  );
  assert.equal(karmicPlanetSignInterpretationCatalog.kind, "karmic_planet_sign");
});

test("retrieves distinct Moon and Saturn karmic lenses", () => {
  const moonScorpio = getKarmicPlanetSignInterpretation("Moon", "Scorpio");
  const saturnLibra = getKarmicPlanetSignInterpretation("Saturn", "Libra");

  assert.match(moonScorpio.interpretation.core_meaning, /crisis, profound attachment/);
  assert.match(saturnLibra.interpretation.core_meaning, /serious education in partnership/);
});
