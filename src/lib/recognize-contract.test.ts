import assert from "node:assert/strict";
import test from "node:test";
import { recognizeResponseSchema, recognizedPatternOffer } from "./recognize-contract";

const acceptedResponse = {
  reply: "That wording seems to fit what you described.",
  currentMode: "RECOGNIZE",
  recognitionStage: "VALIDATED",
  competingExplanations: [],
  privateAstrologyInfluence: null,
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
  assert.equal(recognizedPatternOffer({ ...acceptedResponse, recognitionStage: "CANDIDATE_EVALUATION" }), null);
});

test("hypothesis testing can continue without inventing a candidate Pattern", () => {
  const result = recognizeResponseSchema.safeParse({
    ...acceptedResponse,
    reply: "The key distinction may be whether the opening itself matters, or whether it is mainly the feeling of reward after effort. Which changes the pull more?",
    recognitionStage: "HYPOTHESIS_TESTING",
    competingExplanations: ["An available private opening", "A reward after sustained effort"],
    candidatePattern: null,
    evidenceStrength: "limited",
    unresolvedUncertainty: ["Which condition is independently predictive?"],
    userEvaluationStatus: "awaiting",
    proposedMapAction: "NONE",
    recommendedNextMode: "RECOGNIZE",
  });
  assert.equal(result.success, true);
  assert.equal(result.success && recognizedPatternOffer(result.data), null);
});

test("accepted offers saved under the prior contract remain usable", () => {
  const legacy = {
    reply: acceptedResponse.reply,
    currentMode: acceptedResponse.currentMode,
    candidatePattern: acceptedResponse.candidatePattern,
    supportingObservations: acceptedResponse.supportingObservations,
    evidenceStrength: acceptedResponse.evidenceStrength,
    unresolvedUncertainty: acceptedResponse.unresolvedUncertainty,
    userEvaluationStatus: acceptedResponse.userEvaluationStatus,
    proposedMapAction: acceptedResponse.proposedMapAction,
    recommendedNextMode: acceptedResponse.recommendedNextMode,
    reasonForRecommendation: acceptedResponse.reasonForRecommendation,
  };
  assert.equal(recognizedPatternOffer(legacy), legacy.candidatePattern);
});
