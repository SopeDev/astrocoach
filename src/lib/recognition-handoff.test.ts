import assert from "node:assert/strict";
import test from "node:test";
import { recognitionHandoffFromOrigin, recognitionRejectionMode, shouldReviseFocalMapItem } from "./recognition-handoff";

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

test("DEEP_EXPLORE preserves whether its candidate is new or a revision", () => {
  const newItem = recognitionHandoffFromOrigin({ mode: "DEEP_EXPLORE", internalSignals: deepSignals });
  const revision = recognitionHandoffFromOrigin({ mode: "DEEP_EXPLORE", internalSignals: { ...deepSignals, candidateRelationshipToFocal: "REVISE_FOCAL" } });
  assert.equal(newItem?.relationshipToFocal, "NEW_ITEM");
  assert.equal(revision?.relationshipToFocal, "REVISE_FOCAL");
  assert.equal(shouldReviseFocalMapItem(newItem, true), false);
  assert.equal(shouldReviseFocalMapItem(revision, true), true);
});

test("rejection returns to the mode that initiated recognition", () => {
  const deepHandoff = recognitionHandoffFromOrigin({ mode: "DEEP_EXPLORE", internalSignals: deepSignals });
  assert.equal(recognitionRejectionMode(deepHandoff, true), "DEEP_EXPLORE");
  assert.equal(recognitionRejectionMode(null, false), "EXPLORE");
  assert.equal(recognitionRejectionMode(null, true), "INTEGRATE");
});
