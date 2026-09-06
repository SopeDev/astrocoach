import { z } from "zod";

export const MAP_ITEM_KINDS = ["PATTERN", "INSIGHT"] as const;
export const mapItemKindSchema = z.enum(MAP_ITEM_KINDS);
export type MapItemKind = z.infer<typeof mapItemKindSchema>;

export const candidateMapItemSchema = z.object({
  kind: mapItemKindSchema,
  statement: z.string().min(1).max(500),
});
export type CandidateMapItem = z.infer<typeof candidateMapItemSchema>;

export const CANDIDATE_EVALUATION_ACTIONS = ["YES_EXACTLY", "PARTLY", "NO", "LET_ME_EXPLAIN"] as const;
export const candidateEvaluationActionSchema = z.enum(CANDIDATE_EVALUATION_ACTIONS);
export type CandidateEvaluationAction = z.infer<typeof candidateEvaluationActionSchema>;

export const recognizeSignalsSchema = z.object({
  currentMode: z.literal("RECOGNIZE"),
  recognitionStage: z.enum(["HYPOTHESIS_TESTING", "CANDIDATE_EVALUATION", "VALIDATED", "REJECTED"]),
  competingExplanations: z.array(z.string().max(300)).max(4),
  privateAstrologyInfluence: z.string().max(500).nullable(),
  candidateMapItem: candidateMapItemSchema.nullable(),
  supportingObservations: z.array(z.string().max(300)).max(5),
  evidenceStrength: z.enum(["limited", "moderate", "strong"]),
  unresolvedUncertainty: z.array(z.string().max(300)).max(4),
  userEvaluationStatus: z.enum(["awaiting", "accepted", "partial", "rejected", "uncertain"]),
  proposedMapAction: z.enum(["NONE", "OFFER_SAVE"]),
  recommendedNextMode: z.enum(["EXPLORE", "RECOGNIZE", "PAUSE"]),
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

const legacyRecognizeSignalsSchema = z.object({
  currentMode: z.literal("RECOGNIZE"),
  recognitionStage: z.enum(["HYPOTHESIS_TESTING", "CANDIDATE_EVALUATION", "VALIDATED", "REJECTED"]).optional(),
  competingExplanations: z.array(z.string().max(300)).max(4).optional(),
  privateAstrologyInfluence: z.string().max(500).nullable().optional(),
  candidatePattern: z.string().min(1).max(500).nullable(),
  supportingObservations: z.array(z.string().max(300)).max(5).optional(),
  evidenceStrength: z.enum(["limited", "moderate", "strong"]).optional(),
  unresolvedUncertainty: z.array(z.string().max(300)).max(4).optional(),
  userEvaluationStatus: z.enum(["awaiting", "accepted", "partial", "rejected", "uncertain"]),
  proposedMapAction: z.enum(["NONE", "OFFER_SAVE"]),
  recommendedNextMode: z.enum(["EXPLORE", "RECOGNIZE", "DEEP_EXPLORE", "INTEGRATE", "PAUSE"]).optional(),
  reasonForRecommendation: z.string().max(500).optional(),
  candidateEvaluation: storedCandidateEvaluationSchema.optional(),
}).passthrough();

type StoredRecognizeSignals = z.infer<typeof recognizeStoredSignalsSchema>;

function normalizeStoredSignals(value: unknown): StoredRecognizeSignals | null {
  const current = recognizeStoredSignalsSchema.safeParse(value);
  if (current.success) return current.data;
  const legacy = legacyRecognizeSignalsSchema.safeParse(value);
  if (!legacy.success) return null;
  const accepted = legacy.data.userEvaluationStatus === "accepted" && legacy.data.proposedMapAction === "OFFER_SAVE";
  const rejected = legacy.data.userEvaluationStatus === "rejected";
  const stage = legacy.data.recognitionStage ?? (accepted ? "VALIDATED" : rejected ? "REJECTED" : "CANDIDATE_EVALUATION");
  const recommendation = legacy.data.recommendedNextMode;
  return {
    currentMode: "RECOGNIZE",
    recognitionStage: stage,
    competingExplanations: legacy.data.competingExplanations ?? [],
    privateAstrologyInfluence: legacy.data.privateAstrologyInfluence ?? null,
    candidateMapItem: legacy.data.candidatePattern ? { kind: "PATTERN", statement: legacy.data.candidatePattern } : null,
    supportingObservations: legacy.data.supportingObservations ?? [],
    evidenceStrength: legacy.data.evidenceStrength ?? "moderate",
    unresolvedUncertainty: legacy.data.unresolvedUncertainty ?? [],
    userEvaluationStatus: legacy.data.userEvaluationStatus,
    proposedMapAction: legacy.data.proposedMapAction,
    recommendedNextMode: recommendation === "EXPLORE" ? "EXPLORE" : recommendation === "PAUSE" ? "PAUSE" : "RECOGNIZE",
    reasonForRecommendation: legacy.data.reasonForRecommendation ?? "Preserved from an earlier Pattern recognition response.",
    ...(legacy.data.candidateEvaluation ? { candidateEvaluation: legacy.data.candidateEvaluation } : {}),
  };
}

export type CandidateEvaluationOffer = {
  messageId: string;
  item: CandidateMapItem;
};

export type CandidateEvaluationPromptContext = {
  action: "PARTLY" | "NO" | "LET_ME_EXPLAIN";
  candidateMapItem: CandidateMapItem;
  supportingObservations: string[];
};

export function isValidGeneratedRecognizeSignals(signals: z.infer<typeof recognizeSignalsSchema>) {
  if (signals.recognitionStage === "HYPOTHESIS_TESTING") {
    return signals.candidateMapItem === null &&
      (signals.userEvaluationStatus === "awaiting" || signals.userEvaluationStatus === "uncertain") &&
      signals.proposedMapAction === "NONE";
  }
  if (signals.recognitionStage === "CANDIDATE_EVALUATION") {
    return signals.candidateMapItem !== null &&
      signals.userEvaluationStatus === "awaiting" &&
      signals.proposedMapAction === "NONE";
  }

  // Validation and rejection belong exclusively to explicit application controls.
  return false;
}

export function candidateEvaluationOffer(messageId: string, value: unknown): CandidateEvaluationOffer | null {
  const signals = normalizeStoredSignals(value);
  if (
    !signals ||
    signals.recognitionStage !== "CANDIDATE_EVALUATION" ||
    signals.userEvaluationStatus !== "awaiting" ||
    !signals.candidateMapItem ||
    signals.candidateEvaluation
  ) return null;

  return { messageId, item: signals.candidateMapItem };
}

export function candidateEvaluationPromptContext(value: unknown): CandidateEvaluationPromptContext | null {
  const signals = normalizeStoredSignals(value);
  if (!signals?.candidateMapItem) return null;
  const action = signals.candidateEvaluation?.action;
  if (action !== "PARTLY" && action !== "NO" && action !== "LET_ME_EXPLAIN") return null;
  return { action, candidateMapItem: signals.candidateMapItem, supportingObservations: signals.supportingObservations };
}

export function applyCandidateEvaluation(value: unknown, action: CandidateEvaluationAction) {
  const signals = normalizeStoredSignals(value);
  if (!signals || !candidateEvaluationOffer("candidate", value)) return null;

  const common = { ...signals, candidateEvaluation: { action } };
  if (action === "YES_EXACTLY") {
    return {
      ...common,
      recognitionStage: "VALIDATED" as const,
      userEvaluationStatus: "accepted" as const,
      proposedMapAction: "OFFER_SAVE" as const,
      recommendedNextMode: "PAUSE" as const,
      reasonForRecommendation: "The user explicitly validated the presented Map item through the evaluation controls.",
    };
  }
  if (action === "NO") {
    return {
      ...common,
      recognitionStage: "REJECTED" as const,
      userEvaluationStatus: "rejected" as const,
      proposedMapAction: "NONE" as const,
      recommendedNextMode: "EXPLORE" as const,
      reasonForRecommendation: "The user explicitly rejected the presented Map item through the evaluation controls.",
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

export function recognizedMapItemOffer(value: unknown): CandidateMapItem | null {
  const signals = normalizeStoredSignals(value);
  if (!signals || signals.recognitionStage !== "VALIDATED" || signals.userEvaluationStatus !== "accepted" || signals.proposedMapAction !== "OFFER_SAVE") return null;
  return signals.candidateMapItem;
}
