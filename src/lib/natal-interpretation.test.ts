import assert from "node:assert/strict";
import test from "node:test";
import { calculateNatalChart } from "./natal-chart";
import {
  CURRENT_CATALOG_VERSIONS,
  anchoredThemeFactorIds,
  deterministicThemeFallback,
  interpretationIsCurrent,
  natalInterpretationDocumentSchema,
  NATAL_INTERPRETATION_EVIDENCE_STATUS,
  NATAL_INTERPRETATION_SCHEMA_VERSION,
  NATAL_INTERPRETATION_SOURCE,
  rankNatalChartFactors,
  retrieveNatalInterpretation,
  themeConversationStarterSchema,
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
  const midheaven = factors.find((factor) => factor.kind === "midheaven");
  const nodes = factors.find((factor) => factor.kind === "lunar_node_axis");
  const moon = factors.find((factor) => factor.id === "placement.moon");
  const saturn = factors.find((factor) => factor.id === "placement.saturn");

  assert.equal(factors.length, 13);
  assert.ok(factors.every((factor, index) => index === 0 || factors[index - 1].score >= factor.score));
  assert.equal(sun?.label, "Sun in Capricorn, 10th house");
  assert.ok(sun?.rankingReasons.includes("angular_house"));
  assert.ok(sun?.sourceReferences.some((source) => source.entryId === "planet_sign.sun.capricorn"));
  assert.ok(sun?.sourceReferences.some((source) => source.entryId === "planet_house.sun.10"));
  assert.equal(ascendant?.label, "Aries Ascendant");
  assert.equal(midheaven?.label, "Capricorn Midheaven");
  assert.ok(midheaven?.sourceReferences.some((source) => source.entryId === "midheaven.capricorn"));
  assert.ok(nodes?.rankingReasons.includes("house_axis"));
  assert.ok(moon?.sourceReferences.some((source) => source.catalog === "karmic_planet_signs"));
  assert.ok(saturn?.sourceReferences.some((source) => source.catalog === "karmic_planet_signs"));
});

test("stores three deterministic anchors followed by two emergent themes", () => {
  const document = documentFor("exact");
  const themes = document.chartAtAGlance.themes;
  const anchors = anchoredThemeFactorIds(document.rankedFactors);

  assert.equal(themes.length, 5);
  assert.deepEqual(
    themes.map((theme) => theme.slot),
    ["identity", "karmic", "mission", "emergent_1", "emergent_2"],
  );
  assert.deepEqual(themes[0].supportingFactorIds, anchors.identity);
  assert.deepEqual(themes[1].supportingFactorIds, anchors.karmic);
  assert.deepEqual(themes[2].supportingFactorIds, anchors.mission);
  assert.ok(themes[0].supportingFactorIds.includes("placement.sun"));
  assert.ok(themes[0].supportingFactorIds.some((id) => id.startsWith("ascendant.")));
  assert.ok(themes[1].supportingFactorIds.includes("placement.moon"));
  assert.ok(themes[1].supportingFactorIds.includes("placement.saturn"));
  assert.ok(themes[1].supportingFactorIds.some((id) => id.startsWith("lunar_node_axis.")));
  assert.ok(themes[2].supportingFactorIds.some((id) => id.startsWith("midheaven.")));
});

test("secondary karmic material enriches Moon and Saturn without increasing significance", () => {
  const factors = rankNatalChartFactors({
    planets: [
      { name: "Moon", sign: "Aries" },
      { name: "Saturn", sign: "Taurus" },
    ],
    nodes: [],
    aspects: [],
    angles: null,
  });
  const moon = factors.find((factor) => factor.id === "placement.moon");
  const saturn = factors.find((factor) => factor.id === "placement.saturn");

  assert.equal(moon?.score, 88);
  assert.equal(saturn?.score, 66);
  assert.ok(moon?.sourceReferences.some((source) => source.catalog === "karmic_planet_signs"));
  assert.ok(saturn?.sourceReferences.some((source) => source.catalog === "karmic_planet_signs"));
});

test("unknown birth time excludes time-dependent factors and carries uncertainty", () => {
  const document = documentFor("unknown");

  assert.equal(document.rankedFactors.length, 11);
  assert.ok(document.rankedFactors.every((factor) => factor.kind !== "ascendant"));
  assert.ok(document.rankedFactors.every((factor) => factor.kind !== "midheaven"));
  assert.ok(document.rankedFactors
    .filter((factor) => factor.kind === "planet_placement")
    .every((factor) => factor.rankingReasons.includes("birth_time_unknown")));
  assert.ok(document.rankedFactors
    .flatMap((factor) => factor.sourceReferences)
    .every((source) => source.catalog !== "planet_houses" && source.catalog !== "house_archetypes"));
  assert.equal(document.chartAtAGlance.uncertainty?.kind, "birth_time_unknown");
  assert.ok(document.chartAtAGlance.themes.every((theme) => theme.uncertainty));
  assert.deepEqual(
    document.chartAtAGlance.themes[0].supportingFactorIds,
    ["placement.sun", "placement.moon"],
  );
  assert.ok(!document.chartAtAGlance.themes[2].supportingFactorIds.some(
    (id) => id.startsWith("midheaven."),
  ));
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

test("preferred theme retrieval pins the selected theme without changing provenance", () => {
  const document = documentFor("exact");
  const context = retrieveNatalInterpretation(document, {
    reason: "conversation",
    lifeAreas: ["relationships"],
    text: "How might this show up in my life?",
    preferredThemeId: "theme.mission",
  });

  assert.equal(context?.selection.preferredThemeId, "theme.mission");
  assert.equal(context?.themes[0].id, "theme.mission");
  assert.equal(context?.source, NATAL_INTERPRETATION_SOURCE);
  assert.equal(context?.evidenceStatus, NATAL_INTERPRETATION_EVIDENCE_STATUS);
});

test("theme conversation metadata cannot masquerade as user evidence", () => {
  const parsed = themeConversationStarterSchema.parse({
    source: NATAL_INTERPRETATION_SOURCE,
    evidenceStatus: NATAL_INTERPRETATION_EVIDENCE_STATUS,
    themeId: "theme.karmic",
  });

  assert.equal(parsed.themeId, "theme.karmic");
  assert.equal(parsed.evidenceStatus, "symbolic_hypothesis_not_user_evidence");
  assert.equal(themeConversationStarterSchema.safeParse({
    source: NATAL_INTERPRETATION_SOURCE,
    evidenceStatus: "confirmed",
    themeId: "theme.karmic",
  }).success, false);
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
