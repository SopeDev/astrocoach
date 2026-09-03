import assert from "node:assert/strict";
import test from "node:test";
import { PROMPT_REGRESSION_SCENARIOS } from "./prompt-regression-scenarios";

test("prompt regression set covers the observed conversational failures", () => {
  assert.deepEqual(
    PROMPT_REGRESSION_SCENARIOS.map((scenario) => scenario.id),
    [
      "explore-varied-cadence",
      "explore-chart-changes-inquiry",
      "explore-lived-contradiction-wins",
      "recognize-discriminate-before-candidate",
      "recognize-test-broadened-scope",
      "recognize-no-forced-pattern",
    ],
  );
  for (const scenario of PROMPT_REGRESSION_SCENARIOS) {
    assert.ok(scenario.setup.length > 0);
    assert.ok(scenario.expected.length > 0);
    assert.ok(scenario.forbidden.length > 0);
  }
});
