import { z } from "zod";
import { candidateMapItemSchema, type CandidateMapItem } from "./recognize-contract";

export const DEEP_EXPLORATION_DIMENSIONS = [
  "CONDITIONS",
  "FUNCTION",
  "NEEDS_AND_VALUES",
  "ORIGINS",
  "EXCEPTIONS",
  "CONTRADICTIONS",
  "MAP_CONNECTIONS",
  "ASTROLOGICAL_LENS",
] as const;

export const DEEP_MAP_ITEM_RELATIONSHIPS = ["NEW_ITEM", "REVISE_FOCAL"] as const;

export const deepExploreFocusSchema = z.string().trim().min(1).max(500);

export const deepExploreSignalsSchema = z.object({
  currentMode: z.literal("DEEP_EXPLORE"),
  explorationDimension: z.enum(DEEP_EXPLORATION_DIMENSIONS),
  privateAstrologyInfluence: z.string().max(500).nullable(),
  newObservations: z.array(z.string().max(300)).max(6),
  emergingInsights: z.array(z.string().max(300)).max(4),
  candidateMapItem: candidateMapItemSchema.nullable(),
  candidateRelationshipToFocal: z.enum(DEEP_MAP_ITEM_RELATIONSHIPS).nullable(),
  proposedMapConnections: z.array(z.string().max(300)).max(4),
  unresolvedQuestions: z.array(z.string().max(300)).max(5),
  recommendedNextMode: z.enum(["DEEP_EXPLORE", "RECOGNIZE", "EXPLORE", "PAUSE"]),
  reasonForRecommendation: z.string().max(500),
});

export const deepExploreResponseSchema = deepExploreSignalsSchema.extend({
  reply: z.string().min(1).max(4000),
});

export type DeepExploreSignals = z.infer<typeof deepExploreSignalsSchema>;
export type DeepRecognitionHandoff = {
  candidateMapItem: CandidateMapItem;
  relationshipToFocal: (typeof DEEP_MAP_ITEM_RELATIONSHIPS)[number];
};

export function hasConsistentDeepExploreCandidate(signals: DeepExploreSignals) {
  if (signals.candidateMapItem) {
    return signals.candidateRelationshipToFocal !== null && signals.recommendedNextMode === "RECOGNIZE";
  }
  return signals.candidateRelationshipToFocal === null && signals.recommendedNextMode !== "RECOGNIZE";
}

export function deepRecognitionHandoff(value: unknown): DeepRecognitionHandoff | null {
  const parsed = deepExploreSignalsSchema.safeParse(value);
  if (!parsed.success || !hasConsistentDeepExploreCandidate(parsed.data) || !parsed.data.candidateMapItem || !parsed.data.candidateRelationshipToFocal) return null;
  return {
    candidateMapItem: parsed.data.candidateMapItem,
    relationshipToFocal: parsed.data.candidateRelationshipToFocal,
  };
}
