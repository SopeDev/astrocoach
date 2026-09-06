import assert from "node:assert/strict";
import test from "node:test";
import { exploreMessageSchema, exploreResponseSchema, exploreSignalsSchema, hasConsistentExploreCandidate, titleFromExploreMessage } from "./explore-contract";

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
    recommendedNextMode: "RECOGNIZE",
    reasonForRecommendation: "There is a specific understanding to evaluate.",
  });
  const signals = exploreSignalsSchema.parse(base);
  assert.equal(hasConsistentExploreCandidate(signals), true);
  assert.equal(hasConsistentExploreCandidate({ ...signals, candidateMapItemKind: null }), false);
});

test("conversation titles are compact and single-line", () => {
  const title = titleFromExploreMessage("A long thought\nwith extra spacing ".repeat(8));
  assert.equal(title.includes("\n"), false);
  assert.ok(title.length <= 80);
  assert.ok(title.endsWith("…"));
});
