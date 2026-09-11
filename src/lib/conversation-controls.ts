import { practiceProposalOffer } from "./integrate-contract";
import { candidateEvaluationOffer, recognizedMapItemOffer } from "./recognize-contract";

type ConversationControlMode = "EXPLORE" | "RECOGNIZE" | "INTEGRATE" | "DEEP_EXPLORE";

export function hasUnresolvedConversationControl(mode: ConversationControlMode, internalSignals: unknown) {
  if (mode === "RECOGNIZE") {
    return Boolean(
      candidateEvaluationOffer("message", internalSignals) ||
      recognizedMapItemOffer(internalSignals),
    );
  }
  if (mode === "INTEGRATE") {
    return Boolean(practiceProposalOffer("message", internalSignals));
  }
  return false;
}
