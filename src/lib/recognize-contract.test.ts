import assert from "node:assert/strict";
import test from "node:test";
import { recognizeResponseSchema, recognizedPatternOffer } from "./recognize-contract";

const acceptedResponse = {
  reply: "That wording seems to fit what you described.",
  currentMode: "RECOGNIZE",
  candidatePattern: "When uncertainty rises, I look for more information before trusting my own preference.",
  supportingObservations: ["The user described this in two separate decisions."],
  evidenceStrength: "moderate",
  unresolvedUncertainty: [],
  userEvaluationStatus: "accepted",
  proposedMapAction: "OFFER_SAVE",
  recommendedNextMode: "PAUSE",
  reasonForRecommendation: "The user validated the formulation.",
};

test("RECOGNIZE keeps its visible response separate from evaluation signals", () => {
  assert.equal(recognizeResponseSchema.safeParse(acceptedResponse).success, true);
});

test("only an explicitly accepted formulation can be offered for My Map", () => {
  assert.equal(recognizedPatternOffer(acceptedResponse), acceptedResponse.candidatePattern);
  assert.equal(recognizedPatternOffer({ ...acceptedResponse, userEvaluationStatus: "partial" }), null);
  assert.equal(recognizedPatternOffer({ ...acceptedResponse, proposedMapAction: "NONE" }), null);
});
