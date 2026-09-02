import { exploreSignalsSchema } from "./explore-contract";

const READINESS_CONFIDENCE = 0.7;
const REQUIRED_SUPPORTING_RESPONSES = 2;

type SignalMessage = {
  createdAt: Date;
  internalSignals: unknown;
};

export function shouldOfferRecognition(messages: SignalMessage[], transitionReferenceAt: Date | null) {
  const eligible = messages
    .filter((message) => !transitionReferenceAt || message.createdAt > transitionReferenceAt)
    .slice(-3)
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

  return eligible.length >= REQUIRED_SUPPORTING_RESPONSES;
}
