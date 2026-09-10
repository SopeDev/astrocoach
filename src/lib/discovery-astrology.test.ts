import assert from "node:assert/strict";
import test from "node:test";
import { calculateNatalChart, NATAL_ENGINE_VERSION } from "./natal-chart";
import { reasoningDiscoveryAstrologyContext } from "./astrology-model-context";
import {
  CURRENT_CATALOG_VERSIONS,
  deterministicThemeFallback,
  natalInterpretationDocumentSchema,
  NATAL_INTERPRETATION_EVIDENCE_STATUS,
  NATAL_INTERPRETATION_SCHEMA_VERSION,
  NATAL_INTERPRETATION_SOURCE,
  rankNatalChartFactors,
} from "./natal-interpretation";
import {
  createCurrentTransitSnapshot,
  createDiscoveryAstrologyContext,
  createPersonalizedCurrentTransits,
  currentTransitSnapshotSchema,
  DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS,
  DISCOVERY_TRANSIT_BODY_NAMES,
  transitSnapshotIsFresh,
} from "./discovery-astrology";

function source(timeAccuracy: "exact" | "unknown") {
  const chart = calculateNatalChart({
    birthDate: new Date("2000-01-01T00:00:00.000Z"),
    birthTimeMinutes: timeAccuracy === "exact" ? 12 * 60 : null,
    latitude: 51.4779,
    longitude: 0,
    timezoneId: "UTC",
  });
  const rankedFactors = rankNatalChartFactors(chart.data);
  const interpretation = natalInterpretationDocumentSchema.parse({
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
  return { chart, interpretation };
}

test("freezes the complete interpretation-grade chart, themes, positions, and transit contacts", () => {
  const { chart, interpretation } = source("exact");
  const context = createDiscoveryAstrologyContext({
    natalChart: chart.data,
    natalInterpretation: interpretation,
    natalTimeAccuracy: chart.timeAccuracy,
    engineVersion: NATAL_ENGINE_VERSION,
    calculatedAt: new Date("2026-09-07T12:00:00.000Z"),
  });

  assert.equal(context.calculatedAt, "2026-09-07T12:00:00.000Z");
  assert.deepEqual(context.natalChart, chart.data);
  assert.equal(context.natalThemes.length, 5);
  assert.equal(context.currentTransits.positions.length, DISCOVERY_TRANSIT_BODY_NAMES.length);
  assert.ok(context.currentTransits.positions.some((position) => position.body === "Moon"));
  assert.ok(context.currentTransits.positions.some((position) => position.body === "Chiron"));
  assert.ok(context.currentTransits.positions.some((position) => position.body === "North Node"));
  assert.ok(context.currentTransits.activeAspects.length > 0);
  assert.ok((context.natalChart as { angles: unknown }).angles);
  assert.ok(context.currentTransits.activeAspects.every((point) => point.natalPositionReliability === "exact_time"));
  assert.ok(context.currentTransits.activeAspects.every((transit) => (
    ["conjunction", "sextile", "square", "trine", "opposition"].includes(transit.aspectType)
  )));
});

test("projects the persisted Discovery snapshot into reasoning-grade model context", () => {
  const { chart, interpretation } = source("exact");
  const context = createDiscoveryAstrologyContext({
    natalChart: chart.data,
    natalInterpretation: interpretation,
    natalTimeAccuracy: chart.timeAccuracy,
    engineVersion: NATAL_ENGINE_VERSION,
    calculatedAt: new Date("2026-09-07T12:00:00.000Z"),
  });
  const modelContext = reasoningDiscoveryAstrologyContext(context, "en");
  const serialized = JSON.stringify(modelContext);

  assert.equal(modelContext.chart.placements.length, chart.data.planets.length);
  assert.equal(modelContext.chart.aspects.length, chart.data.aspects.length);
  assert.equal(modelContext.themes.length, 5);
  assert.equal(modelContext.transits.positions.length, context.currentTransits.positions.length);
  assert.equal(modelContext.transits.contacts.length, context.currentTransits.activeAspects.length);
  assert.ok(modelContext.transits.activations);
  for (const calculationKey of [
    "natalChart",
    "natalPoints",
    "longitude",
    "longitudeSpeed",
    "separation",
    "aspectAngle",
    "strength",
    "sourceChartInputHash",
    "engine",
    "translations",
  ]) {
    assert.equal(serialized.includes(`\"${calculationKey}\"`), false);
  }
  assert.ok(serialized.length <= JSON.stringify(context).length);
});

test("reuses one house-free transit snapshot and derives personal aspects from its positions", () => {
  const { chart, interpretation } = source("exact");
  const transitSnapshot = createCurrentTransitSnapshot({
    engineVersion: NATAL_ENGINE_VERSION,
    calculatedAt: new Date("2026-09-07T00:00:00.000Z"),
  });
  const personalized = createPersonalizedCurrentTransits({
    natalChart: chart.data,
    natalInterpretation: interpretation,
    natalTimeAccuracy: chart.timeAccuracy,
    transitSnapshot,
  });
  const context = createDiscoveryAstrologyContext({
    natalChart: chart.data,
    natalInterpretation: interpretation,
    natalTimeAccuracy: chart.timeAccuracy,
    engineVersion: NATAL_ENGINE_VERSION,
    calculatedAt: new Date("2026-09-07T08:00:00.000Z"),
    transitSnapshot,
  });

  assert.equal(currentTransitSnapshotSchema.safeParse(transitSnapshot).success, true);
  const normalizedSnapshot = currentTransitSnapshotSchema.safeParse({
    ...transitSnapshot,
    positions: transitSnapshot.positions.map((position, index) => (
      index === 0 ? { ...position, house: 1 } : position
    )),
  });
  assert.equal(normalizedSnapshot.success, true);
  assert.ok(normalizedSnapshot.success && normalizedSnapshot.data.positions.every((position) => !("house" in position)));
  assert.equal(context.calculatedAt, transitSnapshot.calculatedAt);
  assert.deepEqual(context.currentTransits.positions, transitSnapshot.positions);
  assert.deepEqual(context.currentTransits.activeAspects, personalized.activeAspects);
  assert.ok(transitSnapshot.positions.every((position) => !("house" in position)));
  assert.ok(transitSnapshot.positions.every((position) => !("longitude" in position)));
  assert.ok(transitSnapshot.positions.every((position) => !("longitudeSpeed" in position)));
});

test("treats a transit snapshot as reusable for less than twelve hours", () => {
  const transitSnapshot = createCurrentTransitSnapshot({
    engineVersion: NATAL_ENGINE_VERSION,
    calculatedAt: new Date("2026-09-07T00:00:00.000Z"),
  });

  assert.equal(transitSnapshotIsFresh(transitSnapshot, new Date("2026-09-07T11:59:59.999Z")), true);
  assert.equal(transitSnapshotIsFresh(transitSnapshot, new Date("2026-09-07T12:00:00.000Z")), false);
  assert.equal(transitSnapshotIsFresh(transitSnapshot, new Date("2026-09-06T23:59:59.999Z")), false);
});

test("links current contacts to supported natal aspects", () => {
  const { chart, interpretation } = source("exact");
  const context = createDiscoveryAstrologyContext({
    natalChart: chart.data,
    natalInterpretation: interpretation,
    natalTimeAccuracy: chart.timeAccuracy,
    engineVersion: NATAL_ENGINE_VERSION,
    calculatedAt: new Date("2026-09-07T12:00:00.000Z"),
  });
  const factorMap = new Map(interpretation.rankedFactors.map((factor) => [factor.id, factor]));

  assert.ok(context.currentTransits.natalAspectActivations.length > 0);
  for (const activation of context.currentTransits.natalAspectActivations) {
    const factor = factorMap.get(activation.natalAspectId);
    assert.equal(factor?.kind, "major_aspect");
    assert.ok(activation.transitContactIds.every((id) => (
      context.currentTransits.activeAspects.some((transit) => transit.id === id)
    )));
    assert.equal(typeof activation.bothEndpointsActivated, "boolean");
  }
});

test("treats the complete frozen snapshot as symbolic context with timing boundaries", () => {
  assert.match(DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS, /complete reasoning-grade chart/i);
  assert.match(DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS, /all five themes/i);
  assert.match(DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS, /transits\.activations/i);
  assert.match(DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS, /does not prove an event/i);
  assert.match(DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS, /noon_reference/i);
});

test("omits angles and labels transit contacts as noon-reference when birth time is unknown", () => {
  const { chart, interpretation } = source("unknown");
  const context = createDiscoveryAstrologyContext({
    natalChart: chart.data,
    natalInterpretation: interpretation,
    natalTimeAccuracy: chart.timeAccuracy,
    engineVersion: NATAL_ENGINE_VERSION,
    calculatedAt: new Date("2026-09-07T12:00:00.000Z"),
  });

  assert.equal((context.natalChart as { angles: unknown }).angles, null);
  assert.ok(context.currentTransits.activeAspects.every(
    (transit) => transit.natalPositionReliability === "noon_reference",
  ));
});
