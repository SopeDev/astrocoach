import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateNatalChart,
  NATAL_ASPECT_TYPES,
  NATAL_ENGINE_VERSION,
  NATAL_NODE_METHOD,
  NATAL_SCHEMA_VERSION,
  type UnknownTimeAspect,
} from "./natal-chart";

const referenceInput = {
  birthDate: new Date("2000-01-01T00:00:00.000Z"),
  latitude: 51.4779,
  longitude: 0,
  timezoneId: "UTC",
};
const supportedAspectTypes = new Set<string>(NATAL_ASPECT_TYPES);

test("calculates a deterministic exact-time chart near published J2000 positions", () => {
  const first = calculateNatalChart({ ...referenceInput, birthTimeMinutes: 12 * 60 });
  const second = calculateNatalChart({ ...referenceInput, birthTimeMinutes: 12 * 60 });
  const sun = first.data.planets.find((planet) => planet.name === "Sun");
  const moon = first.data.planets.find((planet) => planet.name === "Moon");

  assert.equal(first.inputHash, second.inputHash);
  assert.equal(first.timeAccuracy, "exact");
  assert.equal(first.houseSystem, "placidus");
  assert.equal(first.data.schemaVersion, NATAL_SCHEMA_VERSION);
  assert.equal(NATAL_ENGINE_VERSION, "0.2.1");
  assert.equal(first.data.planets.length, 11);
  assert.ok(first.data.planets.some((planet) => planet.name === "Chiron"));
  assert.equal(first.data.nodes.length, 2);
  assert.equal(NATAL_NODE_METHOD, "mean");
  assert.ok(first.data.nodes.every((node) => node.type === "Mean"));
  assert.equal(first.data.houses?.cusps.length, 12);
  assert.ok(first.data.angles);
  assert.ok(first.data.aspects.length > 0);
  assert.ok(first.data.aspects.every((aspect) => supportedAspectTypes.has(aspect.type)));
  assert.ok(first.data.aspects.every((aspect) => (
    aspect.body1.length > 0
    && aspect.body2.length > 0
    && Number.isFinite(aspect.angle)
    && Number.isFinite(aspect.separation)
    && Number.isFinite(aspect.deviation)
    && Number.isFinite(aspect.orb)
    && Number.isFinite(aspect.strength)
    && typeof aspect.outOfSign === "boolean"
  )));
  assert.ok(sun && Math.abs(sun.longitude - 280.3765) < 0.01);
  assert.ok(moon && Math.abs(moon.longitude - 223.3187) < 0.01);
});

test("unknown-time charts retain noon-reference positions and day-qualified major aspects", () => {
  const chart = calculateNatalChart({ ...referenceInput, birthTimeMinutes: null });
  const unknownTimeAspects = chart.data.aspects as UnknownTimeAspect[];
  const stableAspect = unknownTimeAspects.find((aspect) => aspect.timeReliability === "stable_across_day");
  const timeSensitiveAspect = unknownTimeAspects.find((aspect) => aspect.timeReliability === "time_sensitive");

  assert.equal(chart.timeAccuracy, "unknown");
  assert.equal(chart.houseSystem, null);
  assert.equal(chart.data.input.referenceTime, "local-noon");
  assert.equal(chart.data.houses, null);
  assert.equal(chart.data.angles, null);
  assert.ok(chart.data.aspects.length > 0);
  assert.equal(unknownTimeAspects.length, chart.data.aspects.length);
  assert.ok(chart.data.aspects.every((aspect) => supportedAspectTypes.has(aspect.type)));
  assert.ok(stableAspect);
  assert.ok(timeSensitiveAspect);
  assert.equal(stableAspect.applying, null);
  assert.equal(stableAspect.sampleCoverage.present, stableAspect.sampleCoverage.total);
  assert.ok(timeSensitiveAspect.sampleCoverage.present < timeSensitiveAspect.sampleCoverage.total);
  assert.ok(stableAspect.strengthRange.minimum <= stableAspect.strengthRange.maximum);
  assert.equal(timeSensitiveAspect.strengthRange.minimum, 0);
  assert.ok(stableAspect.deviationRange.minimum <= stableAspect.deviationRange.maximum);
  assert.equal(chart.data.nodes.length, 2);
  assert.ok(chart.data.nodes.every((node) => !("house" in node)));
  assert.ok(chart.data.nodes.every((node) => typeof node.sign === "string"));
  assert.ok(chart.data.planets.some((planet) => planet.name === "Chiron"));
  assert.ok(chart.data.planets.every((planet) => !("house" in planet)));
  assert.match(chart.data.uncertainty?.note ?? "", /lunar node positions use local noon/i);
  assert.equal(chart.data.uncertainty?.aspectMethod, "sampled-across-local-day");
  assert.equal(chart.data.uncertainty?.aspectSampleMinutes.length, 13);
});

test("historical timezone offsets affect the normalized calculation input", () => {
  const winter = calculateNatalChart({
    ...referenceInput,
    birthDate: new Date("1990-01-01T00:00:00.000Z"),
    birthTimeMinutes: 12 * 60,
    timezoneId: "America/New_York",
  });
  const summer = calculateNatalChart({
    ...referenceInput,
    birthDate: new Date("1990-07-01T00:00:00.000Z"),
    birthTimeMinutes: 12 * 60,
    timezoneId: "America/New_York",
  });

  assert.notEqual(winter.inputHash, summer.inputHash);
  assert.equal(winter.data.input.referenceTime, "exact");
  assert.equal(summer.data.input.referenceTime, "exact");
});
