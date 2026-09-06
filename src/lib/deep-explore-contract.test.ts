import assert from "node:assert/strict";
import test from "node:test";
import { deepExploreFocusSchema, deepExploreResponseSchema, deepExploreSignalsSchema, deepRecognitionHandoff, hasConsistentDeepExploreCandidate } from "./deep-explore-contract";

const response = {
  reply: "The exception seems to reveal something distinct from the original pattern.",
  currentMode: "DEEP_EXPLORE",
  explorationDimension: "EXCEPTIONS",
  privateAstrologyInfluence: null,
  newObservations: ["The response changes when expectations are explicit."],
  emergingInsights: ["Clarity may make closeness safer rather than less free."],
  candidateMapItem: { kind: "INSIGHT", statement: "Clear expectations can make closeness feel safer without taking away my freedom." },
  candidateRelationshipToFocal: "NEW_ITEM",
  proposedMapConnections: ["This may qualify the focal Pattern without replacing it."],
  unresolvedQuestions: [],
  recommendedNextMode: "RECOGNIZE",
  reasonForRecommendation: "A distinct evidence-grounded Insight is ready for evaluation.",
};

test("DEEP_EXPLORE can hand a new Insight to RECOGNIZE", () => {
  const parsed = deepExploreResponseSchema.parse(response);
  const signals = deepExploreSignalsSchema.parse(parsed);
  assert.equal(hasConsistentDeepExploreCandidate(signals), true);
  assert.deepEqual(deepRecognitionHandoff(signals), {
    candidateMapItem: response.candidateMapItem,
    relationshipToFocal: "NEW_ITEM",
  });
});

test("DEEP_EXPLORE distinguishes revision from a new item", () => {
  assert.equal(deepRecognitionHandoff({ ...response, candidateRelationshipToFocal: "REVISE_FOCAL" })?.relationshipToFocal, "REVISE_FOCAL");
});

test("candidate and transition state must agree", () => {
  const candidateWithoutTransition = deepExploreSignalsSchema.parse({ ...response, recommendedNextMode: "DEEP_EXPLORE" });
  const transitionWithoutCandidate = deepExploreSignalsSchema.parse({
    ...response,
    candidateMapItem: null,
    candidateRelationshipToFocal: null,
  });
  const relationshipWithoutCandidate = deepExploreSignalsSchema.parse({
    ...response,
    candidateMapItem: null,
    recommendedNextMode: "DEEP_EXPLORE",
  });
  assert.equal(hasConsistentDeepExploreCandidate(candidateWithoutTransition), false);
  assert.equal(deepRecognitionHandoff(candidateWithoutTransition), null);
  assert.equal(hasConsistentDeepExploreCandidate(transitionWithoutCandidate), false);
  assert.equal(hasConsistentDeepExploreCandidate(relationshipWithoutCandidate), false);
});

test("deepening focus is explicit and bounded", () => {
  assert.equal(deepExploreFocusSchema.parse("  Why does this change when someone depends on me?  "), "Why does this change when someone depends on me?");
  assert.equal(deepExploreFocusSchema.safeParse("").success, false);
  assert.equal(deepExploreFocusSchema.safeParse("x".repeat(501)).success, false);
});
