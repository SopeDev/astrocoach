import assert from "node:assert/strict";
import test from "node:test";
import { exploreMessageSchema, exploreResponseSchema, exploreSignalsSchema, hasConsistentExploreCandidate, titleFromExploreMessage, transitionSafeExploreSignals } from "./explore-contract";

test("EXPLORE output keeps the visible reply separate from valid internal signals", () => {
  const result = exploreResponseSchema.safeParse({
    reply: "What felt most important about that moment?",
    currentMode: "EXPLORE",
    responseApproach: "QUESTION",
    questionPurpose: "Clarify what mattered most.",
    privateAstrologyInfluence: null,
    understandingStatus: "opening",
    importantObservations: ["The user described a recent decision."],
    unresolvedQuestions: ["What outcome were they hoping for?"],
    candidateMapItemSignal: false,
    candidateMapItemConfidence: 0.1,
    candidateMapItemKind: null,
    candidateMapItemStatement: null,
    recommendedNextMode: "EXPLORE",
    reasonForRecommendation: "Important context is still missing.",
  });

  assert.equal(result.success, true);
});

test("EXPLORE rejects invalid mode signals and empty messages", () => {
  assert.equal(exploreMessageSchema.safeParse("   ").success, false);
  assert.equal(exploreResponseSchema.safeParse({ reply: "Hello", currentMode: "ADVISE" }).success, false);
});

test("EXPLORE candidate state requires a classified item", () => {
  const base = exploreResponseSchema.parse({
    reply: "Something specific is taking shape.",
    currentMode: "EXPLORE",
    responseApproach: "CONNECT",
    questionPurpose: null,
    privateAstrologyInfluence: null,
    understandingStatus: "clearer",
    importantObservations: [],
    unresolvedQuestions: [],
    candidateMapItemSignal: true,
    candidateMapItemConfidence: 0.8,
    candidateMapItemKind: "INSIGHT",
    candidateMapItemStatement: "Stability may have become a prerequisite for allowing myself closeness.",
    recommendedNextMode: "RECOGNIZE",
    reasonForRecommendation: "There is a specific understanding to evaluate.",
  });
  const signals = exploreSignalsSchema.parse(base);
  assert.equal(hasConsistentExploreCandidate(signals), true);
  assert.equal(hasConsistentExploreCandidate({ ...signals, candidateMapItemKind: null }), false);
  assert.equal(hasConsistentExploreCandidate({ ...signals, questionPurpose: "Ask for more detail." }), false);
});

test("a candidate reply that asks a question remains in EXPLORE so the composer stays available", () => {
  const signals = exploreSignalsSchema.parse({
    currentMode: "EXPLORE",
    responseApproach: "CONNECT",
    questionPurpose: null,
    privateAstrologyInfluence: null,
    usedAstrologyFactorIds: [],
    usedTransitIds: [],
    understandingStatus: "clearer",
    importantObservations: ["Scarcity appears to narrow the user's space for affection."],
    unresolvedQuestions: ["How much is literal logistics and how much is a personal rule?"],
    candidateMapItemSignal: true,
    candidateMapItemConfidence: 0.82,
    candidateMapItemKind: "INSIGHT",
    candidateMapItemStatement: "Tenderness may support stability rather than only follow it.",
    recommendedNextMode: "RECOGNIZE",
    reasonForRecommendation: "A durable distinction is ready to examine.",
  });

  const safe = transitionSafeExploreSignals("How much is logistics, and how much is a rule?", signals);
  assert.equal(safe.candidateMapItemSignal, false);
  assert.equal(safe.candidateMapItemKind, null);
  assert.equal(safe.candidateMapItemStatement, null);
  assert.equal(safe.recommendedNextMode, "EXPLORE");
  assert.equal(hasConsistentExploreCandidate(safe), true);
});

test("conversation titles are compact and single-line", () => {
  const title = titleFromExploreMessage("A long thought\nwith extra spacing ".repeat(8));
  assert.equal(title.includes("\n"), false);
  assert.ok(title.length <= 80);
  assert.ok(title.endsWith("…"));
});
