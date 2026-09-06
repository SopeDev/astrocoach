import { z } from "zod";

export const PRACTICE_PURPOSES = ["NOTICE_EARLIER", "CREATE_SPACE", "CHECK_INTENTION", "CHOOSE_CONSCIOUSLY", "LEARN_AFTER"] as const;
export const PRACTICE_PRIMITIVES = ["NAME_CUE", "PAUSE", "ASK_ONE_QUESTION", "MAKE_ONE_CHOICE", "NOTE_AFTERWARD"] as const;

export const practiceIdSchema = z.string().uuid();
export const practicePurposeSchema = z.enum(PRACTICE_PURPOSES);
export const practicePrimitiveSchema = z.enum(PRACTICE_PRIMITIVES);
export const practiceIntentionSchema = z.string().trim().min(1).max(300);
export const practiceInstructionSchema = z.string().trim().min(1).max(300);
export const practiceCueSchema = z.string().trim().min(1).max(200);

export const practiceProposalSchema = z.object({
  purpose: practicePurposeSchema,
  primitive: practicePrimitiveSchema,
  instruction: practiceInstructionSchema,
  cue: practiceCueSchema,
});

export type PracticeProposal = z.infer<typeof practiceProposalSchema>;

const ALLOWED_PRIMITIVES: Record<z.infer<typeof practicePurposeSchema>, ReadonlyArray<z.infer<typeof practicePrimitiveSchema>>> = {
  NOTICE_EARLIER: ["NAME_CUE", "NOTE_AFTERWARD"],
  CREATE_SPACE: ["PAUSE"],
  CHECK_INTENTION: ["ASK_ONE_QUESTION"],
  CHOOSE_CONSCIOUSLY: ["ASK_ONE_QUESTION", "MAKE_ONE_CHOICE"],
  LEARN_AFTER: ["NOTE_AFTERWARD"],
};

export function isSupportedPracticeProposal(proposal: PracticeProposal) {
  return ALLOWED_PRIMITIVES[proposal.purpose].includes(proposal.primitive);
}
