import { z } from "zod";

export const exploreMessageSchema = z.string().trim().min(1).max(4000);

export const exploreSignalsSchema = z.object({
  currentMode: z.literal("EXPLORE"),
  understandingStatus: z.enum(["opening", "developing", "clearer", "sufficient"]),
  importantObservations: z.array(z.string().max(300)).max(6),
  unresolvedQuestions: z.array(z.string().max(300)).max(5),
  candidatePatternSignal: z.boolean(),
  candidatePatternConfidence: z.number().min(0).max(1),
  recommendedNextMode: z.enum(["EXPLORE", "RECOGNIZE", "DEEP_EXPLORE", "INTEGRATE", "PAUSE"]),
  reasonForRecommendation: z.string().max(500),
});

export const exploreResponseSchema = exploreSignalsSchema.extend({
  reply: z.string().min(1).max(4000),
});

export type ExploreSignals = Omit<z.infer<typeof exploreResponseSchema>, "reply">;

export function titleFromExploreMessage(content: string) {
  const singleLine = content.replace(/\s+/g, " ").trim();
  return singleLine.length > 80 ? `${singleLine.slice(0, 77).trimEnd()}…` : singleLine;
}
