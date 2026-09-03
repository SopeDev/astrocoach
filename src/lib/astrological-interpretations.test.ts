import assert from "node:assert/strict";
import test from "node:test";
import { lunarNodeInterpretationContext } from "./astrological-interpretations";
import { calculateNatalChart } from "./natal-chart";

test("retrieves only the matching lunar-node sign and house axes", () => {
  const context = lunarNodeInterpretationContext({
    nodes: [
      { name: "North Node", sign: "Leo", house: 5 },
      { name: "South Node", sign: "Aquarius", house: 11 },
    ],
  });

  assert.equal(context?.source.version, 1);
  assert.equal(context?.signAxis?.northNode, "Leo");
  assert.equal(context?.signAxis?.southNode, "Aquarius");
  assert.equal(context?.houseAxis?.northNodeHouse, 5);
  assert.equal(context?.houseAxis?.southNodeHouse, 11);
  assert.match(context?.signAxis?.familiarPattern.summary ?? "", /distance/i);
  assert.match(context?.houseAxis?.developmentalDirection ?? "", /creativity/i);
});

test("omits house interpretation when node houses are unavailable", () => {
  const context = lunarNodeInterpretationContext({
    nodes: [
      { name: "North Node", sign: "Aries" },
      { name: "South Node", sign: "Libra" },
    ],
  });

  assert.equal(context?.signAxis?.northNode, "Aries");
  assert.equal(context?.houseAxis, null);
});

test("returns no interpretation context without a complete nodal axis", () => {
  assert.equal(lunarNodeInterpretationContext({ nodes: [] }), null);
  assert.equal(lunarNodeInterpretationContext({ nodes: [{ name: "North Node", sign: "Aries" }] }), null);
  assert.equal(lunarNodeInterpretationContext({ planets: [] }), null);
});

test("unknown birth time retains sign interpretation but omits house interpretation", () => {
  const chart = calculateNatalChart({
    birthDate: new Date("2000-01-01T00:00:00.000Z"),
    birthTimeMinutes: null,
    latitude: 51.4779,
    longitude: 0,
    timezoneId: "UTC",
  });
  const context = lunarNodeInterpretationContext(chart.data);

  assert.ok(context?.signAxis);
  assert.equal(context?.houseAxis, null);
});
