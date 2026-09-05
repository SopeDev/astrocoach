import assert from "node:assert/strict";
import test from "node:test";
import { calculateNatalChart } from "./natal-chart";
import { chartAtAGlanceView } from "./chart-at-a-glance-view";
import {
  CURRENT_CATALOG_VERSIONS,
  deterministicThemeFallback,
  natalInterpretationDocumentSchema,
  NATAL_INTERPRETATION_EVIDENCE_STATUS,
  NATAL_INTERPRETATION_SCHEMA_VERSION,
  NATAL_INTERPRETATION_SOURCE,
  rankNatalChartFactors,
} from "./natal-interpretation";

function document() {
  const chart = calculateNatalChart({
    birthDate: new Date("2000-01-01T00:00:00.000Z"),
    birthTimeMinutes: 12 * 60,
    latitude: 51.4779,
    longitude: 0,
    timezoneId: "UTC",
  });
  const rankedFactors = rankNatalChartFactors(chart.data);
  return natalInterpretationDocumentSchema.parse({
    schemaVersion: NATAL_INTERPRETATION_SCHEMA_VERSION,
    language: "en",
    source: NATAL_INTERPRETATION_SOURCE,
    evidenceStatus: NATAL_INTERPRETATION_EVIDENCE_STATUS,
    sourceChartInputHash: chart.inputHash,
    catalogVersions: CURRENT_CATALOG_VERSIONS,
    rankedFactors,
    chartAtAGlance: {
      themes: deterministicThemeFallback(rankedFactors, chart.timeAccuracy),
      uncertainty: null,
    },
  });
}

test("builds localized chart browsing data without changing stable theme ids", () => {
  const source = document();
  const english = chartAtAGlanceView(source, "en");
  const spanish = chartAtAGlanceView(source, "es");

  assert.equal(english.themes.length, 5);
  assert.deepEqual(
    spanish.themes.map((theme) => theme.id),
    english.themes.map((theme) => theme.id),
  );
  assert.equal(english.themes[0].title, "Identity and approach to life");
  assert.equal(spanish.themes[0].title, "Identidad y manera de entrar en la vida");
  assert.ok(spanish.themes[0].supportingFactors.includes("Sol en Capricornio, casa 10"));
  assert.ok(spanish.themes[0].supportingFactors.includes("Ascendente en Aries"));
  assert.ok(spanish.themes[2].supportingFactors.includes("Medio Cielo en Capricornio"));
});
