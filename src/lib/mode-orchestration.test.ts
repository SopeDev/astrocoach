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
    candidateMapItemSignal: true,
    candidateMapItemConfidence: 0.8,
    candidateMapItemKind: "PATTERN",
    candidateMapItemStatement: "I repeatedly disappear from my own life when closeness feels unavailable.",
    recommendedNextMode: "RECOGNIZE",
    reasonForRecommendation: "A relationship appears across distinct examples.",
    ...overrides,
  };
}

test("the first qualifying EXPLORE response offers recognition immediately", () => {
  const first = { createdAt: new Date("2026-09-02T10:00:00Z"), internalSignals: signal() };
  assert.equal(shouldOfferRecognition([first], null), true);
});

test("an older qualifying response does not trigger an invitation after the latest response changes direction", () => {
  const qualifying = { createdAt: new Date("2026-09-02T10:00:00Z"), internalSignals: signal() };
  const latest = {
    createdAt: new Date("2026-09-02T10:01:00Z"),
    internalSignals: signal({ candidateMapItemSignal: false, candidateMapItemKind: null, candidateMapItemStatement: null, candidateMapItemConfidence: 0.2, recommendedNextMode: "EXPLORE" }),
  };
  assert.equal(shouldOfferRecognition([qualifying, latest], null), false);
});

test("a declined invitation requires two subsequent qualifying responses before being offered again", () => {
  const beforeDismissal = { createdAt: new Date("2026-09-02T10:00:00Z"), internalSignals: signal() };
  const reference = new Date("2026-09-02T10:01:00Z");
  const firstAfterDismissal = { createdAt: new Date("2026-09-02T10:02:00Z"), internalSignals: signal() };
  const secondAfterDismissal = { createdAt: new Date("2026-09-02T10:03:00Z"), internalSignals: signal() };
  assert.equal(shouldOfferRecognition([beforeDismissal, firstAfterDismissal], reference), false);
  assert.equal(shouldOfferRecognition([beforeDismissal, firstAfterDismissal, secondAfterDismissal], reference), true);
});

test("weak or ambiguous signals do not trigger recognition", () => {
  const messages = [
    { createdAt: new Date("2026-09-02T10:00:00Z"), internalSignals: signal({ candidateMapItemConfidence: 0.5 }) },
    { createdAt: new Date("2026-09-02T10:01:00Z"), internalSignals: signal({ recommendedNextMode: "EXPLORE" }) },
  ];
  assert.equal(shouldOfferRecognition(messages, null), false);
});
