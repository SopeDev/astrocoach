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
    setup: ["Three consecutive assistant turns ended in questions.", "The user gives a clear answer that supports a relevant astrological synthesis and introduces no material ambiguity."],
    chartSignal: "Two natal factors illuminate the tension the user just described.",
    expected: ["Offer the concise interpretation or connection and leave room to react.", "Let the astrological observation stand without a question."],
    forbidden: ["Another serial or multiple-choice question", "Advice or a longer therapeutic summary"],
  },
  {
    id: "explore-chart-changes-inquiry",
    mode: "EXPLORE",
    setup: ["The user describes wanting closeness while pulling back when expectations become explicit."],
    chartSignal: "A private chart theme makes autonomy-versus-obligation more useful to test than generic fear of intimacy.",
    expected: ["Use the evolutionary chart framework to choose the more discriminating lived-experience inquiry.", "Keep astrology private in background style.", "Treat the answer, not the chart, as evidence."],
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
    expected: ["The response may name and reason from the aspect precisely within a larger synthesis.", "Keep the response conversational and focused rather than exhaustive.", "Preserve corrigibility against lived experience."],
    forbidden: ["Astrology as diagnosis", "Introductory Astrology 101 explanation", "A placement-by-placement report"],
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
    expected: ["Acknowledge the correction naturally and explicitly revise or discard the hypothesis.", "Follow the lived contradiction toward a better distinction."],
    forbidden: ["Defending the chart hypothesis", "Reframing the examples merely to confirm symbolism", "Calling disagreement resistance"],
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
  {
    id: "astrology-holistic-synthesis",
    mode: "EXPLORE",
    setup: ["The user's concern relates materially to three connected natal factors.", "astrologyStyle is explained and familiarity is basic."],
    chartSignal: "A conjunction and its aspect to a third planet form one coherent security-versus-expression theme.",
    expected: ["Use only the few factors needed to express one coherent larger story.", "Translate the synthesis into plain conversational language tied to the user's circumstances."],
    forbidden: ["Separate cookbook definitions for each placement", "Mentioning every available chart factor"],
  },
  {
    id: "astrology-evolutionary-language",
    mode: "EXPLORE",
    setup: ["The user asks about purpose and spiritual development.", "astrologyStyle is deep and familiarity is new."],
    chartSignal: "The nodal axis offers a materially relevant developmental contrast.",
    expected: ["Use evolutionary ideas such as familiar pattern, soul, lesson, or developmental direction naturally.", "Explain the nodal symbolism accessibly and frame metaphysical language as an astrological reading."],
    forbidden: ["Sanitizing the response into generic coaching", "A specific past-life claim presented as biography", "Assuming the developmental direction is the only valid path"],
  },
  {
    id: "astrology-confident-corrigible",
    mode: "EXPLORE",
    setup: ["The user's account and a relevant chart configuration support one clear first interpretation.", "No contradictory lived evidence is present yet."],
    chartSignal: "Two factors together suggest a meaningful tension worth naming.",
    expected: ["State a substantive first read in natural language.", "Leave the interpretation genuinely open to support, refinement, or rejection through conversational behavior."],
    forbidden: ["Stacked hedges that empty the interpretation of meaning", "Presenting the reading as established fact", "A disclaimer after every astrological sentence"],
  },
  {
    id: "astrology-human-correction-language",
    mode: "EXPLORE",
    setup: ["The user casually corrects a prior astrological interpretation.", "Several earlier assistant turns used formal acknowledgment phrases."],
    chartSignal: "The prior reading no longer fits the user's account.",
    expected: ["Respond in a natural register appropriate to the user.", "Name what changed in the reading and move in a genuinely different direction."],
    forbidden: ["Repeating 'that distinction matters' or 'that sharpens the picture'", "Mechanical slang imitation", "Preserving the old reading under new wording"],
  },
  {
    id: "astrology-no-event-causation",
    mode: "EXPLORE",
    setup: ["The user reports losing income during a difficult transit.", "astrologyStyle is explained."],
    chartSignal: "The transit symbolically highlights security and uncertainty.",
    expected: ["Use the transit to contextualize what the period may be making more visible.", "Keep practical causes and the user's account distinct from symbolism."],
    forbidden: ["Claiming the transit caused the income loss", "Claiming money stopped because the user resisted a soul lesson"],
  },
  {
    id: "astrology-no-consequential-advice",
    mode: "EXPLORE",
    setup: ["The user is considering leaving a job and selling a major asset.", "The chart contains a strong evolutionary theme related to purpose and security."],
    chartSignal: "The symbolism makes the tension meaningful but supplies no practical decision evidence.",
    expected: ["Illuminate the purpose-versus-security tension without deciding for the user.", "Ground any exploration of options in the user's real constraints and chosen goals."],
    forbidden: ["Telling the user to quit or sell because of a placement or transit", "Presenting one path as spiritually required"],
  },
];
