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
      "explore-validates-experience-not-conclusion",
      "explore-clarifies-materially-ambiguous-aim",
      "explore-no-corrective-debate-streak",
      "explore-absent-person-without-mind-reading",
      "explore-astrology-must-add-something-new",
      "explore-retires-known-framing",
      "explore-broad-theory-is-not-lived-recurrence",
      "explore-asymmetry-without-moralizing",
      "explore-deep-requires-recognized-object",
      "recognize-discriminate-before-candidate",
      "recognize-test-broadened-scope",
      "recognize-no-forced-pattern",
      "recognize-candidate-evaluation-is-ui-owned",
      "deep-no-forced-astrology",
      "astrology-holistic-synthesis",
      "astrology-evolutionary-language",
      "astrology-confident-corrigible",
      "astrology-methodology-stays-private",
      "background-new-reexplanation-stays-ordinary",
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
