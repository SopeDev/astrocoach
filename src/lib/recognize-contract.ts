import { z } from "zod";

export const CANDIDATE_EVALUATION_ACTIONS = ["YES_EXACTLY", "PARTLY", "NO", "LET_ME_EXPLAIN"] as const;
export const candidateEvaluationActionSchema = z.enum(CANDIDATE_EVALUATION_ACTIONS);
export type CandidateEvaluationAction = z.infer<typeof candidateEvaluationActionSchema>;

export const recognizeSignalsSchema = z.object({
  currentMode: z.literal("RECOGNIZE"),
  recognitionStage: z.enum(["HYPOTHESIS_TESTING", "CANDIDATE_EVALUATION", "VALIDATED", "REJECTED"]),
  competingExplanations: z.array(z.string().max(300)).max(4),
  privateAstrologyInfluence: z.string().max(500).nullable(),
  candidatePattern: z.string().min(1).max(500).nullable(),
  supportingObservations: z.array(z.string().max(300)).max(5),
  evidenceStrength: z.enum(["limited", "moderate", "strong"]),
  unresolvedUncertainty: z.array(z.string().max(300)).max(4),
  userEvaluationStatus: z.enum(["awaiting", "accepted", "partial", "rejected", "uncertain"]),
  proposedMapAction: z.enum(["NONE", "OFFER_SAVE"]),
  recommendedNextMode: z.enum(["EXPLORE", "RECOGNIZE", "DEEP_EXPLORE", "INTEGRATE", "PAUSE"]),
  reasonForRecommendation: z.string().max(500),
});

export const recognizeResponseSchema = recognizeSignalsSchema.extend({
  reply: z.string().min(1).max(4000),
});

export type RecognizeSignals = z.infer<typeof recognizeSignalsSchema>;

const storedCandidateEvaluationSchema = z.object({
  action: candidateEvaluationActionSchema,
});

const recognizeStoredSignalsSchema = recognizeSignalsSchema.extend({
  candidateEvaluation: storedCandidateEvaluationSchema.optional(),
});

export type CandidateEvaluationOffer = {
  messageId: string;
  statement: string;
};

export type CandidateEvaluationPromptContext = {
  action: "PARTLY" | "LET_ME_EXPLAIN";
  candidatePattern: string;
  supportingObservations: string[];
};

export function candidateEvaluationOffer(messageId: string, value: unknown): CandidateEvaluationOffer | null {
  const parsed = recognizeStoredSignalsSchema.safeParse(value);
  if (!parsed.success) return null;
  if (
    parsed.data.recognitionStage !== "CANDIDATE_EVALUATION" ||
    parsed.data.userEvaluationStatus !== "awaiting" ||
    !parsed.data.candidatePattern ||
    parsed.data.candidateEvaluation
  ) return null;

  return { messageId, statement: parsed.data.candidatePattern };
}

export function candidateEvaluationPromptContext(value: unknown): CandidateEvaluationPromptContext | null {
  const parsed = recognizeStoredSignalsSchema.safeParse(value);
  if (!parsed.success || !parsed.data.candidatePattern) return null;
  const action = parsed.data.candidateEvaluation?.action;
  if (action !== "PARTLY" && action !== "LET_ME_EXPLAIN") return null;
  return { action, candidatePattern: parsed.data.candidatePattern, supportingObservations: parsed.data.supportingObservations };
}

export function applyCandidateEvaluation(value: unknown, action: CandidateEvaluationAction) {
  const parsed = recognizeStoredSignalsSchema.safeParse(value);
  if (!parsed.success || !candidateEvaluationOffer("candidate", value)) return null;

  const common = { ...parsed.data, candidateEvaluation: { action } };
  if (action === "YES_EXACTLY") {
    return {
      ...common,
      recognitionStage: "VALIDATED" as const,
      userEvaluationStatus: "accepted" as const,
      proposedMapAction: "OFFER_SAVE" as const,
      recommendedNextMode: "PAUSE" as const,
      reasonForRecommendation: "The user explicitly validated the presented candidate through the evaluation controls.",
    };
  }
  if (action === "NO") {
    return {
      ...common,
      recognitionStage: "REJECTED" as const,
      userEvaluationStatus: "rejected" as const,
      proposedMapAction: "NONE" as const,
      recommendedNextMode: "EXPLORE" as const,
      reasonForRecommendation: "The user explicitly rejected the presented candidate through the evaluation controls.",
    };
  }
  if (action === "PARTLY") {
    return {
      ...common,
      userEvaluationStatus: "partial" as const,
      proposedMapAction: "NONE" as const,
      recommendedNextMode: "RECOGNIZE" as const,
      reasonForRecommendation: "The user recognized part of the candidate and wants to qualify or revise it.",
    };
  }
  return {
    ...common,
    userEvaluationStatus: "awaiting" as const,
    proposedMapAction: "NONE" as const,
    recommendedNextMode: "RECOGNIZE" as const,
    reasonForRecommendation: "The user wants to add context before evaluating the candidate.",
  };
}

const legacyRecognizeSignalsSchema = z.object({
  currentMode: z.literal("RECOGNIZE"),
  candidatePattern: z.string().min(1).max(500),
  userEvaluationStatus: z.enum(["awaiting", "accepted", "partial", "rejected", "uncertain"]),
  proposedMapAction: z.enum(["NONE", "OFFER_SAVE"]),
}).passthrough();

export function recognizedPatternOffer(value: unknown) {
  const parsed = recognizeSignalsSchema.safeParse(value);
  if (parsed.success) {
    if (parsed.data.recognitionStage !== "VALIDATED" || parsed.data.userEvaluationStatus !== "accepted" || parsed.data.proposedMapAction !== "OFFER_SAVE") return null;
    return parsed.data.candidatePattern;
  }

  // Existing accepted offers remain usable after the staged RECOGNIZE contract upgrade.
  const legacy = legacyRecognizeSignalsSchema.safeParse(value);
  if (!legacy.success || legacy.data.userEvaluationStatus !== "accepted" || legacy.data.proposedMapAction !== "OFFER_SAVE") return null;
  return legacy.data.candidatePattern;
}
