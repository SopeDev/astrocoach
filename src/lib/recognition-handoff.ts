import { deepRecognitionHandoff } from "./deep-explore-contract";
import type { CandidateMapItem } from "./recognize-contract";

export type RecognitionOriginMode = "EXPLORE" | "INTEGRATE" | "DEEP_EXPLORE";

export type RecognitionHandoffContext = {
  originMode: RecognitionOriginMode;
  relationshipToFocal: "NEW_ITEM" | "REVISE_FOCAL";
  candidateMapItem: CandidateMapItem | null;
};

export function recognitionHandoffFromOrigin(origin: { mode: RecognitionOriginMode | "RECOGNIZE"; internalSignals: unknown } | null): RecognitionHandoffContext | null {
  if (!origin) return null;
  if (origin.mode === "EXPLORE") return { originMode: "EXPLORE", relationshipToFocal: "NEW_ITEM", candidateMapItem: null };
  if (origin.mode === "INTEGRATE") return { originMode: "INTEGRATE", relationshipToFocal: "REVISE_FOCAL", candidateMapItem: null };

  if (origin.mode !== "DEEP_EXPLORE") return null;
  const handoff = deepRecognitionHandoff(origin.internalSignals);
  return handoff ? { originMode: "DEEP_EXPLORE", relationshipToFocal: handoff.relationshipToFocal, candidateMapItem: handoff.candidateMapItem } : null;
}

export function recognitionRejectionMode(handoff: RecognitionHandoffContext | null, hasFocalMapItem: boolean): RecognitionOriginMode {
  return handoff?.originMode ?? (hasFocalMapItem ? "INTEGRATE" : "EXPLORE");
}

export function shouldReviseFocalMapItem(handoff: RecognitionHandoffContext | null, hasFocalMapItem: boolean) {
  return handoff ? handoff.relationshipToFocal === "REVISE_FOCAL" : hasFocalMapItem;
}
