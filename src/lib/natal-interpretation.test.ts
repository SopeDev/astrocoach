import assert from "node:assert/strict";
import test from "node:test";
import { calculateNatalChart } from "./natal-chart";
import {
  CURRENT_CATALOG_VERSIONS,
  deterministicThemeFallback,
  interpretationIsCurrent,
  natalInterpretationDocumentSchema,
  NATAL_INTERPRETATION_EVIDENCE_STATUS,
  NATAL_INTERPRETATION_SCHEMA_VERSION,
  NATAL_INTERPRETATION_SOURCE,
  rankNatalChartFactors,
  retrieveNatalInterpretation,
} from "./natal-interpretation";

const referenceInput = {
  birthDate: new Date("2000-01-01T00:00:00.000Z"),
  latitude: 51.4779,
  longitude: 0,
  timezoneId: "UTC",
};

function documentFor(timeAccuracy: "exact" | "unknown") {
  const chart = calculateNatalChart({
    ...referenceInput,
    birthTimeMinutes: timeAccuracy === "exact" ? 12 * 60 : null,
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
      uncertainty: chart.timeAccuracy === "unknown" ? {
        kind: "birth_time_unknown",
        omittedFactors: ["ascendant", "houses", "aspects"],
        note: "Birth time is unknown.",
      } : null,
    },
  });
}

test("matches and ranks exact-time chart factors from authored catalogs", () => {
  const chart = calculateNatalChart({ ...referenceInput, birthTimeMinutes: 12 * 60 });
  const factors = rankNatalChartFactors(chart.data);
  const sun = factors.find((factor) => factor.id === "placement.sun");
  const ascendant = factors.find((factor) => factor.kind === "ascendant");
  const nodes = factors.find((factor) => factor.kind === "lunar_node_axis");

  assert.equal(factors.length, 12);
  assert.ok(factors.every((factor, index) => index === 0 || factors[index - 1].score >= factor.score));
  assert.equal(sun?.label, "Sun in Capricorn, 10th house");
  assert.ok(sun?.rankingReasons.includes("angular_house"));
  assert.ok(sun?.sourceReferences.some((source) => source.entryId === "planet_sign.sun.capricorn"));
  assert.ok(sun?.sourceReferences.some((source) => source.entryId === "planet_house.sun.10"));
  assert.equal(ascendant?.label, "Aries Ascendant");
  assert.ok(nodes?.rankingReasons.includes("house_axis"));
});

test("unknown birth time excludes time-dependent factors and carries uncertainty", () => {
  const document = documentFor("unknown");

  assert.equal(document.rankedFactors.length, 11);
  assert.ok(document.rankedFactors.every((factor) => factor.kind !== "ascendant"));
  assert.ok(document.rankedFactors
    .filter((factor) => factor.kind === "planet_placement")
    .every((factor) => factor.rankingReasons.includes("birth_time_unknown")));
  assert.ok(document.rankedFactors
    .flatMap((factor) => factor.sourceReferences)
    .every((source) => source.catalog !== "planet_houses" && source.catalog !== "house_archetypes"));
  assert.equal(document.chartAtAGlance.uncertainty?.kind, "birth_time_unknown");
  assert.ok(document.chartAtAGlance.themes.every((theme) => theme.uncertainty));
});

test("retrieval returns only a bounded, provenance-safe relevant subset", () => {
  const document = documentFor("exact");
  const context = retrieveNatalInterpretation(document, {
    reason: "conversation",
    lifeAreas: ["relationships"],
    text: "I keep wondering what happens in close partnerships.",
  });

  assert.equal(context?.source, "natal_interpretation");
  assert.equal(context?.evidenceStatus, "symbolic_hypothesis_not_user_evidence");
  assert.ok((context?.themes.length ?? 0) <= 3);
  assert.ok((context?.factors.length ?? 0) <= 6);
  assert.ok(context?.selection.topics.includes("relationships"));
  assert.ok(context?.factors.some((factor) => factor.topics.includes("relationships") || factor.topics.includes("partnership")));
  assert.equal("planets" in (context ?? {}), false);
  assert.equal("aspects" in (context ?? {}), false);
});

test("stored interpretations are invalidated by chart or catalog version changes", () => {
  const document = documentFor("exact");

  assert.equal(interpretationIsCurrent(document, document.sourceChartInputHash), true);
  assert.equal(interpretationIsCurrent(document, "different-chart"), false);
  assert.equal(interpretationIsCurrent({
    ...document,
    catalogVersions: { ...document.catalogVersions, planetSigns: 999 },
  }, document.sourceChartInputHash), false);
});

test("invalid chart data does not produce matched factors", () => {
  assert.deepEqual(rankNatalChartFactors(null), []);
  assert.deepEqual(rankNatalChartFactors({ planets: [{ name: "Unknown", sign: "Nowhere" }] }), []);
});
