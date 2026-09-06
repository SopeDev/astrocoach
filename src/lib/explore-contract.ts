import { z } from "zod";

export const exploreMessageSchema = z.string().trim().min(1).max(4000);

export const exploreSignalsSchema = z.object({
  currentMode: z.literal("EXPLORE"),
  responseApproach: z.enum(["REFLECT", "CONTRAST", "CONNECT", "COMPETING_INTERPRETATION", "QUESTION", "OPEN_SPACE"]),
  questionPurpose: z.string().max(300).nullable(),
  privateAstrologyInfluence: z.string().max(500).nullable(),
  understandingStatus: z.enum(["opening", "developing", "clearer", "sufficient"]),
  importantObservations: z.array(z.string().max(300)).max(6),
  unresolvedQuestions: z.array(z.string().max(300)).max(5),
  candidateMapItemSignal: z.boolean(),
  candidateMapItemConfidence: z.number().min(0).max(1),
  candidateMapItemKind: z.enum(["PATTERN", "INSIGHT"]).nullable(),
  recommendedNextMode: z.enum(["EXPLORE", "RECOGNIZE", "PAUSE"]),
  reasonForRecommendation: z.string().max(500),
});

export const exploreResponseSchema = exploreSignalsSchema.extend({
  reply: z.string().min(1).max(4000),
});

export type ExploreSignals = Omit<z.infer<typeof exploreResponseSchema>, "reply">;

export function hasConsistentExploreCandidate(signals: ExploreSignals) {
  return signals.candidateMapItemSignal
    ? signals.candidateMapItemKind !== null
    : signals.candidateMapItemKind === null && signals.candidateMapItemConfidence < 0.7;
}

const legacyExploreSignalsSchema = z.object({
  currentMode: z.literal("EXPLORE"),
  responseApproach: z.enum(["REFLECT", "CONTRAST", "CONNECT", "COMPETING_INTERPRETATION", "QUESTION", "OPEN_SPACE"]),
  questionPurpose: z.string().max(300).nullable(),
  privateAstrologyInfluence: z.string().max(500).nullable(),
  understandingStatus: z.enum(["opening", "developing", "clearer", "sufficient"]),
  importantObservations: z.array(z.string().max(300)).max(6),
  unresolvedQuestions: z.array(z.string().max(300)).max(5),
  candidatePatternSignal: z.boolean(),
  candidatePatternConfidence: z.number().min(0).max(1),
  recommendedNextMode: z.enum(["EXPLORE", "RECOGNIZE", "DEEP_EXPLORE", "INTEGRATE", "PAUSE"]),
  reasonForRecommendation: z.string().max(500),
});

export function parseStoredExploreSignals(value: unknown): ExploreSignals | null {
  const current = exploreSignalsSchema.safeParse(value);
  if (current.success) return current.data;
  const legacy = legacyExploreSignalsSchema.safeParse(value);
  if (!legacy.success) return null;
  const { candidatePatternSignal, candidatePatternConfidence, ...signals } = legacy.data;
  return {
    ...signals,
    candidateMapItemSignal: candidatePatternSignal,
    candidateMapItemConfidence: candidatePatternConfidence,
    candidateMapItemKind: candidatePatternSignal ? "PATTERN" : null,
    recommendedNextMode: signals.recommendedNextMode === "RECOGNIZE" ? "RECOGNIZE"
      : signals.recommendedNextMode === "PAUSE" ? "PAUSE" : "EXPLORE",
  };
}

export function titleFromExploreMessage(content: string) {
  const singleLine = content.replace(/\s+/g, " ").trim();
  return singleLine.length > 80 ? `${singleLine.slice(0, 77).trimEnd()}…` : singleLine;
}
