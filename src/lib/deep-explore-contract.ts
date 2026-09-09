import { z } from "zod";
import { candidateMapItemSchema, type CandidateMapItem } from "./recognize-contract";
import { astrologyProvenanceFields } from "./astrology-provenance";

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
  ...astrologyProvenanceFields,
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
  const parsed = deepExploreSignalsSchema.partial({
    usedAstrologyFactorIds: true,
    usedTransitIds: true,
  }).safeParse(value);
  if (!parsed.success) return null;
  const signals = {
    ...parsed.data,
    usedAstrologyFactorIds: parsed.data.usedAstrologyFactorIds ?? [],
    usedTransitIds: parsed.data.usedTransitIds ?? [],
  };
  if (!hasConsistentDeepExploreCandidate(signals) || !signals.candidateMapItem || !signals.candidateRelationshipToFocal) return null;
  return {
    candidateMapItem: signals.candidateMapItem,
    relationshipToFocal: signals.candidateRelationshipToFocal,
  };
}
