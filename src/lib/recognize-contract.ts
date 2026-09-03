import { z } from "zod";

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
