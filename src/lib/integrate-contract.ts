import { z } from "zod";
import { isSupportedPracticeProposal, practiceProposalSchema, type PracticeProposal } from "./practices";

export const integrateSignalsSchema = z.object({
  currentMode: z.literal("INTEGRATE"),
  integrationStage: z.enum(["CLARIFY_INTENTION", "PRACTICE_PROPOSAL", "LIFE_OBSERVATION"]),
  integrationIntention: z.string().min(1).max(300),
  knownCues: z.array(z.string().max(200)).max(5),
  proposedJunction: z.string().max(300).nullable(),
  proposedPractice: practiceProposalSchema.nullable(),
  newLivedEvidence: z.string().max(500).nullable(),
  mapItemRevisionSignal: z.boolean(),
  recommendedNextMode: z.enum(["EXPLORE", "RECOGNIZE", "INTEGRATE", "PAUSE"]),
  reasonForRecommendation: z.string().max(500),
});

export const integrateResponseSchema = integrateSignalsSchema.extend({
  reply: z.string().min(1).max(4000),
});

const storedIntegrateSignalsSchema = integrateSignalsSchema.extend({
  practiceActivation: z.object({ practiceId: z.string().uuid() }).optional(),
});

export type PracticeProposalOffer = { messageId: string; intention: string; proposal: PracticeProposal };

export function practiceProposalOffer(messageId: string, value: unknown): PracticeProposalOffer | null {
  const parsed = storedIntegrateSignalsSchema.safeParse(value);
  if (!parsed.success || parsed.data.integrationStage !== "PRACTICE_PROPOSAL" || !parsed.data.proposedPractice || !isSupportedPracticeProposal(parsed.data.proposedPractice) || parsed.data.practiceActivation) return null;
  return { messageId, intention: parsed.data.integrationIntention, proposal: parsed.data.proposedPractice };
}

export function applyPracticeActivation(value: unknown, practiceId: string) {
  const parsed = storedIntegrateSignalsSchema.safeParse(value);
  if (!parsed.success || !practiceProposalOffer("proposal", value)) return null;
  return { ...parsed.data, practiceActivation: { practiceId }, recommendedNextMode: "PAUSE" as const, reasonForRecommendation: "The user activated one small Practice and will take it into life." };
}

export function livedEvidenceFromIntegrate(value: unknown) {
  const parsed = storedIntegrateSignalsSchema.safeParse(value);
  return parsed.success ? parsed.data.newLivedEvidence : null;
}

export function shouldOfferMapItemRevision(value: unknown) {
  const parsed = storedIntegrateSignalsSchema.safeParse(value);
  return parsed.success &&
    parsed.data.integrationStage === "LIFE_OBSERVATION" &&
    parsed.data.mapItemRevisionSignal &&
    parsed.data.recommendedNextMode === "RECOGNIZE";
}
