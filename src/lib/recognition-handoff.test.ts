import assert from "node:assert/strict";
import test from "node:test";
import { recognitionHandoffFromOrigin, recognitionReturnMode, shouldReviseFocalMapItem } from "./recognition-handoff";

const deepSignals = {
  currentMode: "DEEP_EXPLORE",
  explorationDimension: "CONTRADICTIONS",
  privateAstrologyInfluence: null,
  newObservations: [],
  emergingInsights: ["The exception changes the original scope."],
  candidateMapItem: { kind: "INSIGHT", statement: "Clarity changes how I experience closeness." },
  candidateRelationshipToFocal: "NEW_ITEM",
  proposedMapConnections: [],
  unresolvedQuestions: [],
  recommendedNextMode: "RECOGNIZE",
  reasonForRecommendation: "A distinct Insight is ready.",
};

test("EXPLORE creates a new item while INTEGRATE revises the focal item", () => {
  assert.equal(recognitionHandoffFromOrigin({ mode: "EXPLORE", internalSignals: null })?.relationshipToFocal, "NEW_ITEM");
  assert.equal(recognitionHandoffFromOrigin({ mode: "INTEGRATE", internalSignals: null })?.relationshipToFocal, "REVISE_FOCAL");
});

test("EXPLORE hands the candidate and deferred question to the first RECOGNIZE turn", () => {
  const handoff = recognitionHandoffFromOrigin({
    mode: "EXPLORE",
    internalSignals: {
      currentMode: "EXPLORE",
      responseApproach: "CONNECT",
      questionPurpose: null,
      privateAstrologyInfluence: "Venus and Saturn sharpened the connection.",
      usedAstrologyFactorIds: ["aspect.saturn.trine.venus"],
      usedTransitIds: [],
      understandingStatus: "clearer",
      importantObservations: ["The user cuts affection and play first during scarcity."],
      unresolvedQuestions: ["How much is logistics and how much is a self-imposed rule?"],
      candidateMapItemSignal: true,
      candidateMapItemConfidence: 0.82,
      candidateMapItemKind: "INSIGHT",
      candidateMapItemStatement: "Tenderness may help sustain stability rather than only become permissible after it.",
      recommendedNextMode: "RECOGNIZE",
      reasonForRecommendation: "A durable distinction is ready to examine.",
    },
  });

  assert.deepEqual(handoff?.candidateMapItem, {
    kind: "INSIGHT",
    statement: "Tenderness may help sustain stability rather than only become permissible after it.",
  });
  assert.deepEqual(handoff?.unresolvedQuestions, ["How much is logistics and how much is a self-imposed rule?"]);
  assert.equal(handoff?.supportingObservations.length, 1);
});

test("DEEP_EXPLORE preserves whether its candidate is new or a revision", () => {
  const newItem = recognitionHandoffFromOrigin({ mode: "DEEP_EXPLORE", internalSignals: deepSignals });
  const revision = recognitionHandoffFromOrigin({ mode: "DEEP_EXPLORE", internalSignals: { ...deepSignals, candidateRelationshipToFocal: "REVISE_FOCAL" } });
  assert.equal(newItem?.relationshipToFocal, "NEW_ITEM");
  assert.equal(revision?.relationshipToFocal, "REVISE_FOCAL");
  assert.equal(shouldReviseFocalMapItem(newItem, true), false);
  assert.equal(shouldReviseFocalMapItem(revision, true), true);
});

test("recognition returns to the mode that initiated it", () => {
  const exploreHandoff = recognitionHandoffFromOrigin({ mode: "EXPLORE", internalSignals: null });
  const integrateHandoff = recognitionHandoffFromOrigin({ mode: "INTEGRATE", internalSignals: null });
  const deepHandoff = recognitionHandoffFromOrigin({ mode: "DEEP_EXPLORE", internalSignals: deepSignals });
  assert.equal(recognitionReturnMode(exploreHandoff, false), "EXPLORE");
  assert.equal(recognitionReturnMode(integrateHandoff, true), "INTEGRATE");
  assert.equal(recognitionReturnMode(deepHandoff, true), "DEEP_EXPLORE");
  assert.equal(recognitionReturnMode(null, false), "EXPLORE");
  assert.equal(recognitionReturnMode(null, true), "INTEGRATE");
});
