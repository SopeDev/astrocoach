export type PromptRegressionScenario = {
  id: string;
  mode: "DISCOVERY" | "EXPLORE" | "RECOGNIZE";
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
    id: "discovery-balanced-natural-mention",
    mode: "DISCOVERY",
    setup: ["A natal theme is materially relevant to one selected life area.", "astrologyStyle is balanced and familiarity is basic."],
    chartSignal: "A security-related placement makes the durability of felt safety worth testing.",
    expected: ["The chart connection may be mentioned naturally in one question.", "Keep the lived-experience inquiry central and provide brief context for terminology."],
    forbidden: ["Astrology appended mechanically to every question", "Treating the placement as evidence"],
  },
  {
    id: "discovery-explained-tentative-reason",
    mode: "DISCOVERY",
    setup: ["astrologyStyle is explained and familiarity is new."],
    chartSignal: "A second-house Saturn theme suggests investigating felt security.",
    expected: ["Briefly explain which chart feature made the question worth asking.", "Define necessary terminology accessibly.", "Invite confirmation or contradiction."],
    forbidden: ["Because the placement exists, the psychological claim is true", "Unexplained specialist vocabulary"],
  },
  {
    id: "explore-deep-relevant-detail",
    mode: "EXPLORE",
    setup: ["astrologyStyle is deep, familiarity is advanced, and the user is exploring a materially related theme."],
    chartSignal: "A close natal aspect offers a useful competing interpretation.",
    expected: ["The response may name and reason from the aspect precisely.", "Preserve uncertainty and test it against lived experience."],
    forbidden: ["Astrology as diagnosis", "Introductory Astrology 101 explanation"],
  },
  {
    id: "familiarity-new-accessible",
    mode: "EXPLORE",
    setup: ["astrologyStyle is explained and familiarity is new."],
    chartSignal: "A relevant house placement is worth surfacing.",
    expected: ["Explain the necessary term briefly in everyday language."],
    forbidden: ["Assuming knowledge of houses, rulers, or aspect notation"],
  },
  {
    id: "familiarity-advanced-no-basics",
    mode: "RECOGNIZE",
    setup: ["astrologyStyle is explained and familiarity is advanced."],
    chartSignal: "A relevant placement helps discriminate two hypotheses.",
    expected: ["Use precise terminology without unnecessary basic definitions.", "Keep lived observations as the recognition evidence."],
    forbidden: ["Explaining what a planet, sign, or house is", "Counting the chart as pattern support"],
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
  {
    id: "deep-no-forced-astrology",
    mode: "EXPLORE",
    setup: ["astrologyStyle is deep and familiarity is advanced.", "The latest exchange is fully understood and natal context adds no useful distinction."],
    chartSignal: null,
    expected: ["Respond to the lived experience without inserting astrology.", "Set private astrology influence to null."],
    forbidden: ["An irrelevant placement reference", "Astrology added only because the user selected deep"],
  },
];
