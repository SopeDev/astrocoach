import { exploreSignalsSchema } from "./explore-contract";

const READINESS_CONFIDENCE = 0.7;
const REQUIRED_REOFFER_RESPONSES = 2;

type SignalMessage = {
  createdAt: Date;
  internalSignals: unknown;
};

export function shouldOfferRecognition(messages: SignalMessage[], transitionReferenceAt: Date | null) {
  const messagesSinceReference = messages.filter(
    (message) => !transitionReferenceAt || message.createdAt > transitionReferenceAt,
  );
  const candidates = transitionReferenceAt
    ? messagesSinceReference.slice(-3)
    : messagesSinceReference.slice(-1);
  const eligible = candidates
    .filter((message) => {
      const parsed = exploreSignalsSchema.safeParse(message.internalSignals);
      if (!parsed.success) return false;
      const signal = parsed.data;
      return (
        signal.candidatePatternSignal &&
        signal.candidatePatternConfidence >= READINESS_CONFIDENCE &&
        signal.recommendedNextMode === "RECOGNIZE" &&
        (signal.understandingStatus === "clearer" || signal.understandingStatus === "sufficient")
      );
    });

  // A qualifying latest signal is enough to invite the user into the mode
  // designed to evaluate the candidate. After a decline, require corroborated
  // readiness from subsequent turns before interrupting EXPLORE again.
  const requiredResponses = transitionReferenceAt ? REQUIRED_REOFFER_RESPONSES : 1;
  return eligible.length >= requiredResponses;
}
