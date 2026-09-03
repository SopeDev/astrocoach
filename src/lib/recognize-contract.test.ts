import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCandidateEvaluation,
  candidateEvaluationOffer,
  candidateEvaluationPromptContext,
  recognizeResponseSchema,
  recognizedPatternOffer,
} from "./recognize-contract";

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

const awaitingCandidate = {
  ...acceptedResponse,
  reply: "I think we've landed on something specific here.",
  recognitionStage: "CANDIDATE_EVALUATION",
  userEvaluationStatus: "awaiting",
  proposedMapAction: "NONE",
  recommendedNextMode: "RECOGNIZE",
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

test("an awaiting candidate produces application-owned evaluation controls", () => {
  assert.deepEqual(candidateEvaluationOffer("message-1", awaitingCandidate), {
    messageId: "message-1",
    statement: awaitingCandidate.candidatePattern,
  });
  assert.equal(candidateEvaluationOffer("message-1", acceptedResponse), null);
});

test("YES_EXACTLY validates without another model turn and proceeds to the save offer", () => {
  const evaluated = applyCandidateEvaluation(awaitingCandidate, "YES_EXACTLY");
  assert.equal(evaluated?.recognitionStage, "VALIDATED");
  assert.equal(evaluated?.userEvaluationStatus, "accepted");
  assert.equal(evaluated?.proposedMapAction, "OFFER_SAVE");
  assert.equal(recognizedPatternOffer(evaluated), awaitingCandidate.candidatePattern);
  assert.equal(candidateEvaluationOffer("message-1", evaluated), null);
});

test("PARTLY preserves partial agreement and candidate context without validating", () => {
  const evaluated = applyCandidateEvaluation(awaitingCandidate, "PARTLY");
  assert.equal(evaluated?.recognitionStage, "CANDIDATE_EVALUATION");
  assert.equal(evaluated?.userEvaluationStatus, "partial");
  assert.equal(evaluated?.proposedMapAction, "NONE");
  assert.deepEqual(candidateEvaluationPromptContext(evaluated), {
    action: "PARTLY",
    candidatePattern: awaitingCandidate.candidatePattern,
    supportingObservations: awaitingCandidate.supportingObservations,
  });
});

test("NO rejects the candidate and returns toward EXPLORE", () => {
  const evaluated = applyCandidateEvaluation(awaitingCandidate, "NO");
  assert.equal(evaluated?.recognitionStage, "REJECTED");
  assert.equal(evaluated?.userEvaluationStatus, "rejected");
  assert.equal(evaluated?.recommendedNextMode, "EXPLORE");
  assert.equal(recognizedPatternOffer(evaluated), null);
});

test("LET_ME_EXPLAIN remains unevaluated and is distinct from PARTLY", () => {
  const explain = applyCandidateEvaluation(awaitingCandidate, "LET_ME_EXPLAIN");
  const partly = applyCandidateEvaluation(awaitingCandidate, "PARTLY");
  assert.equal(explain?.recognitionStage, "CANDIDATE_EVALUATION");
  assert.equal(explain?.userEvaluationStatus, "awaiting");
  assert.equal(explain?.proposedMapAction, "NONE");
  assert.equal(candidateEvaluationPromptContext(explain)?.action, "LET_ME_EXPLAIN");
  assert.equal(candidateEvaluationPromptContext(partly)?.action, "PARTLY");
  assert.equal(candidateEvaluationOffer("message-1", explain), null);
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
