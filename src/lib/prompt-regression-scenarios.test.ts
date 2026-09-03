import assert from "node:assert/strict";
import test from "node:test";
import { PROMPT_REGRESSION_SCENARIOS } from "./prompt-regression-scenarios";

test("prompt regression set covers the observed conversational failures", () => {
  assert.deepEqual(
    PROMPT_REGRESSION_SCENARIOS.map((scenario) => scenario.id),
    [
      "explore-varied-cadence",
      "explore-chart-changes-inquiry",
      "discovery-balanced-natural-mention",
      "discovery-explained-tentative-reason",
      "explore-deep-relevant-detail",
      "familiarity-new-accessible",
      "familiarity-advanced-no-basics",
      "explore-lived-contradiction-wins",
      "recognize-discriminate-before-candidate",
      "recognize-test-broadened-scope",
      "recognize-no-forced-pattern",
      "recognize-candidate-evaluation-is-ui-owned",
      "deep-no-forced-astrology",
      "astrology-holistic-synthesis",
      "astrology-evolutionary-language",
      "astrology-confident-corrigible",
      "astrology-human-correction-language",
      "astrology-no-event-causation",
      "astrology-no-consequential-advice",
    ],
  );
  for (const scenario of PROMPT_REGRESSION_SCENARIOS) {
    assert.ok(scenario.setup.length > 0);
    assert.ok(scenario.expected.length > 0);
    assert.ok(scenario.forbidden.length > 0);
  }
});
