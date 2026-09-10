import assert from "node:assert/strict";
import test from "node:test";
import { calculateNatalChart } from "./natal-chart";
import { reasoningInterpretationContext } from "./astrology-model-context";
import {
  CURRENT_CATALOG_VERSIONS,
  anchoredThemeFactorIds,
  buildNatalThemeGenerationInput,
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
        omittedFactors: ["ascendant", "houses"],
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
  const sunSaturnTrine = factors.find(
    (factor) => factor.id === "aspect.saturn.trine.sun",
  );

  assert.ok(factors.length > 13);
  assert.equal(
    factors.filter((factor) => factor.kind === "major_aspect").length,
    chart.data.aspects.length,
  );
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
  assert.equal(sunSaturnTrine?.label, "Sun trine Saturn");
  assert.equal(sunSaturnTrine?.aspect?.type, "trine");
  assert.equal(sunSaturnTrine?.aspect?.timeReliability, "exact_time");
  assert.equal(sunSaturnTrine?.aspect?.applying, false);
  assert.ok((sunSaturnTrine?.aspect?.deviation ?? 0) > 0);
  assert.ok(sunSaturnTrine?.sourceReferences.some((source) => source.entryId === "aspect.trine"));
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
  assert.ok(themes[0].supportingFactorIds.some((id) => id.startsWith("aspect.")));
  assert.ok(themes[1].supportingFactorIds.includes("placement.moon"));
  assert.ok(themes[1].supportingFactorIds.includes("placement.saturn"));
  assert.ok(themes[1].supportingFactorIds.some((id) => id.startsWith("lunar_node_axis.")));
  assert.ok(themes[2].supportingFactorIds.some((id) => id.startsWith("midheaven.")));
});

test("passes every eligible major aspect to theme generation without calculation geometry", () => {
  const chart = calculateNatalChart({ ...referenceInput, birthTimeMinutes: 12 * 60 });
  const factors = rankNatalChartFactors(chart.data);
  const input = buildNatalThemeGenerationInput(factors, chart.timeAccuracy);
  const suppliedFactors = [
    ...input.anchoredThemes.flatMap((theme) => theme.factors),
    ...input.emergentCandidateFactors,
  ];
  const suppliedAspectIds = new Set(
    suppliedFactors.filter((factor) => factor.id.startsWith("aspect.")).map((factor) => factor.id),
  );
  const rankedAspects = factors.filter((factor) => factor.kind === "major_aspect");

  assert.deepEqual(
    [...suppliedAspectIds].sort(),
    rankedAspects.map((factor) => factor.id).sort(),
  );
  assert.ok(suppliedFactors.some((factor) => (
    factor.id === "aspect.saturn.trine.sun"
    && factor.fact.includes("Sun trine Saturn")
    && factor.fact.includes("° orb")
  )));
  assert.ok(suppliedFactors.every((factor) => !("aspectDetails" in factor)));
  assert.ok(suppliedFactors.every((factor) => !("rankingReasons" in factor)));
  assert.ok(suppliedFactors.every((factor) => !("topics" in factor)));
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

test("time-sensitive unknown-time aspects are excluded instead of changing placement significance", () => {
  const factors = rankNatalChartFactors({
    planets: [
      { name: "Sun", sign: "Aries" },
      { name: "Moon", sign: "Taurus" },
    ],
    nodes: [],
    aspects: [{
      body1: "Sun",
      body2: "Moon",
      type: "square",
      angle: 90,
      separation: 89,
      deviation: 1,
      orb: 8,
      strength: 100,
      applying: null,
      outOfSign: false,
      timeReliability: "time_sensitive",
    }],
    angles: null,
  });
  const sun = factors.find((factor) => factor.id === "placement.sun");
  const moon = factors.find((factor) => factor.id === "placement.moon");

  assert.equal(sun?.score, 90);
  assert.equal(moon?.score, 88);
  assert.ok(factors.every((factor) => factor.kind !== "major_aspect"));
});

test("stable unknown-time aspects become explicit factors without double-counting placements", () => {
  const factors = rankNatalChartFactors({
    planets: [
      { name: "Sun", sign: "Aries" },
      { name: "Moon", sign: "Taurus" },
    ],
    nodes: [],
    aspects: [{
      body1: "Sun",
      body2: "Moon",
      type: "trine",
      angle: 120,
      separation: 121,
      deviation: 1,
      orb: 8,
      strength: 88,
      applying: null,
      outOfSign: false,
      timeReliability: "stable_across_day",
      referenceTimeMinutes: 720,
      sampleCoverage: { present: 13, total: 13 },
      strengthRange: { minimum: 82, maximum: 92 },
      deviationRange: { minimum: 0.6, maximum: 1.4 },
    }],
    angles: null,
  });
  const sun = factors.find((factor) => factor.id === "placement.sun");
  const moon = factors.find((factor) => factor.id === "placement.moon");
  const aspect = factors.find((factor) => factor.kind === "major_aspect");

  assert.equal(sun?.score, 90);
  assert.equal(moon?.score, 88);
  assert.equal(aspect?.id, "aspect.moon.trine.sun");
  assert.equal(aspect?.aspect?.timeReliability, "stable_across_day");
  assert.equal(aspect?.aspect?.sampleCoverage, undefined);
  assert.ok(aspect?.rankingReasons.includes("stable_across_day"));
  assert.ok(aspect?.rankingReasons.includes("birth_time_unknown"));
});

test("unknown birth time excludes time-dependent factors and carries uncertainty", () => {
  const document = documentFor("unknown");

  assert.ok(document.rankedFactors.length > 11);
  assert.ok(document.rankedFactors.every((factor) => factor.kind !== "ascendant"));
  assert.ok(document.rankedFactors.every((factor) => factor.kind !== "midheaven"));
  assert.ok(document.rankedFactors
    .filter((factor) => factor.kind === "planet_placement")
    .every((factor) => factor.rankingReasons.includes("birth_time_unknown")));
  assert.ok(document.rankedFactors
    .flatMap((factor) => factor.sourceReferences)
    .every((source) => source.catalog !== "planet_houses" && source.catalog !== "house_archetypes"));
  assert.ok(document.rankedFactors.some((factor) => factor.kind === "major_aspect"));
  assert.ok(document.rankedFactors
    .filter((factor) => factor.kind === "major_aspect")
    .every((factor) => factor.aspect?.timeReliability === "stable_across_day"));
  assert.equal(document.chartAtAGlance.uncertainty?.kind, "birth_time_unknown");
  assert.ok(document.chartAtAGlance.themes.every((theme) => theme.uncertainty));
  assert.deepEqual(
    document.chartAtAGlance.themes[0].supportingFactorIds,
    anchoredThemeFactorIds(document.rankedFactors).identity,
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
  assert.ok(context?.selection.factorSelections.every((selection) => selection.reasons.length > 0));
});

test("conversation retrieval treats factor limits as ceilings and preserves continuity", () => {
  const document = documentFor("exact");
  const noSignalContext = retrieveNatalInterpretation(document, {
    reason: "conversation",
    lifeAreas: [],
    maxThemes: 0,
    maxFactors: 4,
  });
  assert.equal(noSignalContext?.themes.length, 0);
  assert.equal(noSignalContext?.factors.length, 0);

  const continuityContext = retrieveNatalInterpretation(document, {
    reason: "conversation",
    lifeAreas: [],
    text: "I mentioned my career in passing.",
    continuityFactorIds: ["placement.saturn", "placement.moon"],
    maxThemes: 0,
    maxFactors: 2,
  });
  assert.deepEqual(
    continuityContext?.factors.map((factor) => factor.id),
    ["placement.saturn", "placement.moon"],
  );
  assert.equal(continuityContext?.selection.maxFactors, 2);
  assert.equal(continuityContext?.selection.expandedThemeIds.length, 0);
});

test("broad onboarding interests cannot qualify deep factors by themselves", () => {
  const document = documentFor("exact");
  const context = retrieveNatalInterpretation(document, {
    reason: "conversation",
    lifeAreas: ["relationships", "money", "career", "habits", "selfUnderstanding"],
    text: "Nobody in my orbit. Astrology pun intended.",
    maxThemes: 0,
    maxFactors: 4,
  });

  assert.equal(context?.factors.length, 0);
  assert.equal(context?.selection.factorSelections.length, 0);
});

test("one current topic selects sparsely while explicit astrology can select a deeper synthesis", () => {
  const document = documentFor("exact");
  const topical = retrieveNatalInterpretation(document, {
    reason: "conversation",
    lifeAreas: ["relationships", "money", "career"],
    text: "I have been thinking about partnership.",
    maxThemes: 0,
    maxFactors: 4,
  });
  const explicit = retrieveNatalInterpretation(document, {
    reason: "conversation",
    lifeAreas: ["relationships", "money"],
    text: "I keep thinking about the tension between my Moon and Saturn.",
    maxThemes: 0,
    maxFactors: 4,
  });

  assert.equal(topical?.factors.length, 1);
  assert.ok((explicit?.factors.length ?? 0) >= 2);
  assert.ok((explicit?.factors.length ?? 0) <= 4);
  assert.ok(explicit?.selection.factorSelections.some((selection) => selection.reasons.includes("explicit_factor_reference")));
});

test("per-turn model context keeps selected authored meaning without retrieval machinery", () => {
  const document = documentFor("exact");
  const retrieved = retrieveNatalInterpretation(document, {
    reason: "conversation",
    lifeAreas: ["relationships", "money"],
    text: "How do my Moon and Saturn work together here?",
    maxThemes: 0,
    maxFactors: 4,
  });
  const modelContext = reasoningInterpretationContext(retrieved);
  const serialized = JSON.stringify(modelContext);

  assert.ok((modelContext?.factors.length ?? 0) >= 2);
  assert.ok(modelContext?.factors.every((factor) => factor.id && factor.fact && factor.interpretation));
  for (const omittedKey of [
    "selection",
    "factorSelections",
    "rankingReasons",
    "sourceReferences",
    "topics",
    "strength",
    "separation",
    "aspectDetails",
  ]) {
    assert.equal(serialized.includes(`\"${omittedKey}\"`), false);
  }
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
