import assert from "node:assert/strict";
import test from "node:test";
import {
  CONVERSATION_CONTEXT_VERSION,
  conversationContextSnapshotSchema,
  createConversationContextSnapshot,
  exportConversationContext,
  providerConversationContext,
  providerConversationSeedItems,
  providerHistoryItems,
} from "./conversation-context";
import {
  createCurrentTransitSnapshot,
  createPersonalizedCurrentTransits,
  interpretationCurrentTransits,
} from "./discovery-astrology";
import { calculateNatalChart } from "./natal-chart";
import {
  CURRENT_CATALOG_VERSIONS,
  deterministicThemeFallback,
  natalInterpretationDocumentSchema,
  NATAL_INTERPRETATION_EVIDENCE_STATUS,
  NATAL_INTERPRETATION_SCHEMA_VERSION,
  NATAL_INTERPRETATION_SOURCE,
  rankNatalChartFactors,
} from "./natal-interpretation";

function snapshot() {
  const chart = calculateNatalChart({
    birthDate: new Date("2000-01-01T00:00:00.000Z"),
    birthTimeMinutes: 720,
    latitude: 51.4779,
    longitude: 0,
    timezoneId: "UTC",
  });
  const factors = rankNatalChartFactors(chart.data);
  const interpretation = natalInterpretationDocumentSchema.parse({
    schemaVersion: NATAL_INTERPRETATION_SCHEMA_VERSION,
    language: "en",
    source: NATAL_INTERPRETATION_SOURCE,
    evidenceStatus: NATAL_INTERPRETATION_EVIDENCE_STATUS,
    sourceChartInputHash: chart.inputHash,
    catalogVersions: CURRENT_CATALOG_VERSIONS,
    rankedFactors: factors,
    chartAtAGlance: {
      themes: deterministicThemeFallback(factors, chart.timeAccuracy),
      uncertainty: null,
    },
  });

  const currentTransits = createPersonalizedCurrentTransits({
    natalChart: chart.data,
    natalInterpretation: interpretation,
    natalTimeAccuracy: chart.timeAccuracy,
    transitSnapshot: createCurrentTransitSnapshot({
      engineVersion: "0.2.1",
      calculatedAt: new Date("2026-09-06T06:00:00.000Z"),
    }),
  });

  return createConversationContextSnapshot({
    localeAtStart: "en",
    birth: {
      date: "2000-01-01",
      localTime: "12:00",
      timeAccuracy: "exact",
      place: "London, England, United Kingdom",
    },
    natalChart: {
      timeAccuracy: chart.timeAccuracy,
      houseSystem: chart.houseSystem,
      data: chart.data,
    },
    natalInterpretation: interpretation,
    currentTransits: interpretationCurrentTransits(currentTransits),
    onboarding: {
      selectedLifeAreaKeys: ["relationships"],
      selectedLifeAreas: ["Relationships"],
      initialDescription: "I want to understand a recurring dynamic.",
      exchanges: [{ question: "What tends to happen?", answer: "I pull away." }],
    },
    preferences: { astrologyFamiliarity: "basic", astrologyStyle: "balanced" },
    conversationStart: { mode: "EXPLORE", focalMapItem: null, relatedMapItems: [] },
  }, new Date("2026-09-06T12:00:00.000Z"));
}

test("conversation context captures complete birth and chart data once", () => {
  const context = snapshot();
  assert.equal(context.schemaVersion, CONVERSATION_CONTEXT_VERSION);
  assert.equal(context.birth.date, "2000-01-01");
  assert.equal(context.birth.localTime, "12:00");
  assert.match(context.birth.place ?? "", /London/);
  const chartData = context.natalChart.data as { aspects: unknown[] };
  assert.equal(chartData.aspects.length > 0, true);
  assert.equal(context.natalInterpretation.rankedFactors.some((factor) => factor.kind === "major_aspect"), true);
  assert.equal(context.currentTransits.snapshot.calculatedAt, "2026-09-06T06:00:00.000Z");
  assert.ok(context.currentTransits.snapshot.positions.every((position) => !("house" in position)));
  assert.ok(context.currentTransits.activeAspects.length > 0);
  const serialized = JSON.stringify(context);
  for (const calculationKey of ["latitude", "longitude", "longitudeSpeed", "second", "cusps", "separation", "strength"]) {
    assert.equal(serialized.includes(`\"${calculationKey}\"`), false);
  }
});

test("provider seed identifies the snapshot as persistent context rather than a request", () => {
  const context = snapshot();
  const items = providerConversationSeedItems(context);
  assert.equal(items[0].role, "developer");
  assert.match(items[0].content, /throughout this conversation/i);
  assert.equal(items[1].role, "user");
  assert.match(items[1].content, /astrocoachConversationContext/);
  assert.match(items[1].content, /London/);
  assert.match(items[1].content, /currentTransits/);
});

test("provider context preserves broad awareness without the full authored interpretation library", () => {
  const context = snapshot();
  const providerContext = providerConversationContext(context);
  assert.equal(providerContext.themes.length, 5);
  assert.equal(providerContext.onboarding.exchanges.length, context.onboarding.exchanges.length);
  assert.equal(providerContext.chart.placements.length, (context.natalChart.data as { planets: unknown[] }).planets.length);
  assert.equal(providerContext.chart.aspects.length, (context.natalChart.data as { aspects: unknown[] }).aspects.length);
  assert.equal("natalChart" in providerContext, false);
  assert.equal("natalInterpretation" in providerContext, false);
  assert.equal("translations" in providerContext.themes[0], false);
  assert.ok("currentTransits" in providerContext);
  assert.equal("activations" in (providerContext.currentTransits ?? {}), false);
  const serialized = JSON.stringify(providerContext);
  assert.equal((serialized.match(/2000-01-01/g) ?? []).length, 1);
  for (const calculationKey of [
    "latitude",
    "longitude",
    "longitudeSpeed",
    "birthInstant",
    "utcOffsetMinutes",
    "timeMinutes",
    "cusps",
    "separation",
    "aspectAngle",
    "strength",
    "activatesNatalAspectIds",
  ]) {
    assert.equal(serialized.includes(`\"${calculationKey}\"`), false);
  }
  assert.ok(serialized.length < JSON.stringify(context).length * 0.25);
});

test("conversation export context contains interpretation-grade astrology only", () => {
  const exported = exportConversationContext(snapshot());
  assert.ok(exported);
  assert.equal(exported?.authoredFactors.length > 0, true);
  assert.equal(exported?.themes.length, 5);
  const serialized = JSON.stringify(exported);
  for (const calculationKey of [
    "latitude", "longitude", "longitudeSpeed", "birthInstant", "utcOffsetMinutes",
    "cusps", "second", "separation", "aspectAngle", "strength", "activatesNatalAspectIds",
  ]) {
    assert.equal(serialized.includes(`\"${calculationKey}\"`), false);
  }
});

test("legacy conversation snapshots remain readable without retroactively adding transits", () => {
  const current = snapshot();
  const { currentTransits: _currentTransits, ...withoutTransits } = current;
  assert.ok(_currentTransits.activeAspects.length > 0);
  const legacy = conversationContextSnapshotSchema.parse({
    ...withoutTransits,
    schemaVersion: 1,
    birth: {
      date: current.birth.date,
      timeMinutes: 720,
      timeAccuracy: "exact",
      birthInstant: "2000-01-01T12:00:00.000Z",
      utcOffsetMinutes: 0,
      location: {
        geonameId: 2643743,
        name: "London",
        administrativeArea: "England",
        country: "United Kingdom",
        countryCode: "GB",
        latitude: 51.4779,
        longitude: 0,
        timezoneId: "UTC",
      },
    },
    natalChart: {
      engine: "celestine",
      engineVersion: "0.2.1",
      schemaVersion: 3,
      inputHash: "legacy-input-hash",
      timeAccuracy: current.natalChart.timeAccuracy,
      houseSystem: current.natalChart.houseSystem,
      sourceProfileUpdatedAt: "2026-09-06T00:00:00.000Z",
      calculatedAt: "2026-09-06T00:00:00.000Z",
      data: current.natalChart.data,
    },
  });

  assert.equal(legacy.schemaVersion, 1);
  assert.equal("currentTransits" in legacy, false);
});

test("legacy history can be added to a newly initialized provider conversation", () => {
  assert.deepEqual(providerHistoryItems([
    { role: "user", content: "One" },
    { role: "assistant", content: "Two" },
  ]), [
    { role: "user", content: "One" },
    { role: "assistant", content: "Two", phase: "final_answer" },
  ]);
});
