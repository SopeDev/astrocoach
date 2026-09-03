export type PromptRegressionScenario = {
  id: string;
  mode: "EXPLORE" | "RECOGNIZE";
  setup: string[];
  chartSignal: string | null;
  expected: string[];
  forbidden: string[];
};

/**
 * Small, provider-independent behavior set for reviewing prompt changes.
 * These are intentionally assertions about behavior rather than preferred prose.
 */
export const PROMPT_REGRESSION_SCENARIOS: PromptRegressionScenario[] = [
  {
    id: "explore-varied-cadence",
    mode: "EXPLORE",
    setup: ["Three consecutive assistant turns ended in questions.", "The user gives a clear, reflective answer that introduces no material ambiguity."],
    chartSignal: null,
    expected: ["Respond with a concise reflection, contrast, tentative connection, or open space.", "No question is required."],
    forbidden: ["Another serial multiple-choice question", "Advice or a longer therapeutic summary"],
  },
  {
    id: "explore-chart-changes-inquiry",
    mode: "EXPLORE",
    setup: ["The user describes wanting closeness while pulling back when expectations become explicit."],
    chartSignal: "A private chart theme makes autonomy-versus-obligation more useful to test than generic fear of intimacy.",
    expected: ["Use the chart to choose the more discriminating lived-experience inquiry.", "Keep astrology private in background style.", "Treat the answer, not the chart, as evidence."],
    forbidden: ["A generic question unchanged by natal context", "Astrological terminology", "Treating symbolism as true"],
  },
  {
    id: "explore-lived-contradiction-wins",
    mode: "EXPLORE",
    setup: ["A chart-derived hypothesis suggests conflict avoidance.", "The user gives concrete examples of initiating difficult conversations."],
    chartSignal: "Conflict avoidance was initially plausible.",
    expected: ["Revise or discard the private hypothesis.", "Follow the lived contradiction toward a better distinction."],
    forbidden: ["Defending the chart hypothesis", "Reframing the examples merely to confirm symbolism"],
  },
  {
    id: "recognize-discriminate-before-candidate",
    mode: "RECOGNIZE",
    setup: ["Several descriptions come from one episode after focused work.", "Both reward-after-effort and private-unstructured-opportunity remain plausible."],
    chartSignal: "A private theme suggests testing structure versus permission, but supplies no evidence.",
    expected: ["Use HYPOTHESIS_TESTING.", "Ask at most one question that distinguishes the competing explanations.", "Keep candidatePattern null."],
    forbidden: ["Immediate candidate formulation", "OFFER_SAVE", "Counting astrology as support"],
  },
  {
    id: "recognize-test-broadened-scope",
    mode: "RECOGNIZE",
    setup: ["A narrow candidate concerns one behavior in a private opening.", "The user broadens it to any opportunity for simple pleasure."],
    chartSignal: null,
    expected: ["Test one independent example or cross-context contrast before adopting the broader scope.", "Keep the formulation as narrow as current evidence."],
    forbidden: ["Saving the broad formulation from agreement alone", "Assuming two labels for one episode are independent evidence"],
  },
  {
    id: "recognize-no-forced-pattern",
    mode: "RECOGNIZE",
    setup: ["Examples remain inconsistent after a discriminating question.", "No specific relationship survives the user's corrections."],
    chartSignal: "A symbolic theme remains plausible but unsupported.",
    expected: ["Acknowledge that no defensible recurring Pattern is established.", "Recommend returning to EXPLORE or pausing."],
    forbidden: ["Manufacturing a vague Pattern", "VALIDATED", "OFFER_SAVE"],
  },
];
