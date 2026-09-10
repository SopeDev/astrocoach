type RetrievalStateInput = {
  focalMapItem?: { statement: string } | null;
  recognitionHandoff?: {
    candidateMapItem?: { statement: string } | null;
    supportingObservations?: string[];
    unresolvedQuestions?: string[];
  } | null;
  candidateEvaluationContext?: {
    candidateMapItem: { statement: string };
    supportingObservations: string[];
  } | null;
  activePractice?: {
    intention: string;
    instruction: string;
    cue: string;
  } | null;
  recentObservations?: Array<{ content: string; learning: string | null }>;
  latestAssistantSignals?: unknown;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function candidateStatement(value: unknown) {
  const candidate = record(value);
  return typeof candidate?.statement === "string" ? candidate.statement : null;
}

function currentSignalState(value: unknown) {
  const signal = record(value);
  if (!signal || typeof signal.currentMode !== "string") return null;

  if (signal.currentMode === "EXPLORE") {
    return {
      candidateMapItemStatement: typeof signal.candidateMapItemStatement === "string"
        ? signal.candidateMapItemStatement
        : null,
      importantObservations: strings(signal.importantObservations),
      unresolvedQuestions: strings(signal.unresolvedQuestions),
    };
  }
  if (signal.currentMode === "RECOGNIZE") {
    return {
      candidateMapItemStatement: candidateStatement(signal.candidateMapItem),
      supportingObservations: strings(signal.supportingObservations),
      unresolvedQuestions: strings(signal.unresolvedUncertainty),
    };
  }
  if (signal.currentMode === "DEEP_EXPLORE") {
    return {
      candidateMapItemStatement: candidateStatement(signal.candidateMapItem),
      newObservations: strings(signal.newObservations),
      emergingInsights: strings(signal.emergingInsights),
      unresolvedQuestions: strings(signal.unresolvedQuestions),
    };
  }
  if (signal.currentMode === "INTEGRATE") {
    return {
      integrationIntention: typeof signal.integrationIntention === "string" ? signal.integrationIntention : null,
      knownCues: strings(signal.knownCues),
      proposedJunction: typeof signal.proposedJunction === "string" ? signal.proposedJunction : null,
      newLivedEvidence: typeof signal.newLivedEvidence === "string" ? signal.newLivedEvidence : null,
    };
  }
  return null;
}

export function astrologyRetrievalState(input: RetrievalStateInput) {
  const state = {
    focalMapItemStatement: input.focalMapItem?.statement ?? null,
    handoffCandidateStatement: input.recognitionHandoff?.candidateMapItem?.statement ?? null,
    handoffSupportingObservations: input.recognitionHandoff?.supportingObservations ?? [],
    handoffUnresolvedQuestions: input.recognitionHandoff?.unresolvedQuestions ?? [],
    evaluationCandidateStatement: input.candidateEvaluationContext?.candidateMapItem.statement ?? null,
    evaluationSupportingObservations: input.candidateEvaluationContext?.supportingObservations ?? [],
    activePractice: input.activePractice
      ? {
          intention: input.activePractice.intention,
          instruction: input.activePractice.instruction,
          cue: input.activePractice.cue,
        }
      : null,
    recentObservations: input.recentObservations ?? [],
    latestAssistantState: currentSignalState(input.latestAssistantSignals),
  };

  const hasContent = Boolean(
    state.focalMapItemStatement ||
    state.handoffCandidateStatement ||
    state.handoffSupportingObservations.length ||
    state.handoffUnresolvedQuestions.length ||
    state.evaluationCandidateStatement ||
    state.evaluationSupportingObservations.length ||
    state.activePractice ||
    state.recentObservations.length ||
    state.latestAssistantState,
  );
  return hasContent ? JSON.stringify(state) : null;
}
