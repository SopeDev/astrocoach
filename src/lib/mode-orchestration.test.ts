import assert from "node:assert/strict";
import test from "node:test";
import { shouldOfferRecognition } from "./mode-orchestration";

function signal(overrides: Record<string, unknown> = {}) {
  return {
    currentMode: "EXPLORE",
    responseApproach: "CONNECT",
    questionPurpose: null,
    privateAstrologyInfluence: null,
    understandingStatus: "clearer",
    importantObservations: [],
    unresolvedQuestions: [],
    candidatePatternSignal: true,
    candidatePatternConfidence: 0.8,
    recommendedNextMode: "RECOGNIZE",
    reasonForRecommendation: "A relationship appears across distinct examples.",
    ...overrides,
  };
}

test("recognition requires two recent qualifying EXPLORE responses", () => {
  const first = { createdAt: new Date("2026-09-02T10:00:00Z"), internalSignals: signal() };
  const second = { createdAt: new Date("2026-09-02T10:01:00Z"), internalSignals: signal() };
  assert.equal(shouldOfferRecognition([first], null), false);
  assert.equal(shouldOfferRecognition([first, second], null), true);
});

test("dismissal requires new evidence before recognition can be offered again", () => {
  const beforeDismissal = { createdAt: new Date("2026-09-02T10:00:00Z"), internalSignals: signal() };
  const reference = new Date("2026-09-02T10:01:00Z");
  const afterDismissal = { createdAt: new Date("2026-09-02T10:02:00Z"), internalSignals: signal() };
  assert.equal(shouldOfferRecognition([beforeDismissal, afterDismissal], reference), false);
});

test("weak or ambiguous signals do not trigger recognition", () => {
  const messages = [
    { createdAt: new Date("2026-09-02T10:00:00Z"), internalSignals: signal({ candidatePatternConfidence: 0.5 }) },
    { createdAt: new Date("2026-09-02T10:01:00Z"), internalSignals: signal({ recommendedNextMode: "EXPLORE" }) },
  ];
  assert.equal(shouldOfferRecognition(messages, null), false);
});
