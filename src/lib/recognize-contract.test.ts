import assert from "node:assert/strict";
import test from "node:test";
import { applyCandidateEvaluation, candidateEvaluationOffer, candidateEvaluationPromptContext, isValidGeneratedRecognizeSignals, recognizeResponseSchema, recognizeSignalsSchema, recognizedMapItemOffer } from "./recognize-contract";

const acceptedResponse = {
  reply: "That wording seems to fit what you described.",
  currentMode: "RECOGNIZE",
  recognitionStage: "VALIDATED",
  competingExplanations: [],
  privateAstrologyInfluence: null,
  candidateMapItem: { kind: "INSIGHT", statement: "Having complete information is less important to me than trusting my own preference." },
  supportingObservations: ["The user distinguished certainty from self-trust."],
  evidenceStrength: "moderate",
  unresolvedUncertainty: [],
  userEvaluationStatus: "accepted",
  proposedMapAction: "OFFER_SAVE",
  recommendedNextMode: "PAUSE",
  reasonForRecommendation: "The user validated the formulation.",
};

const awaitingCandidate = { ...acceptedResponse, reply: "I think we've landed on something specific here.", recognitionStage: "CANDIDATE_EVALUATION", userEvaluationStatus: "awaiting", proposedMapAction: "NONE", recommendedNextMode: "RECOGNIZE" };

test("RECOGNIZE supports a system-classified Insight candidate", () => {
  assert.equal(recognizeResponseSchema.safeParse(acceptedResponse).success, true);
});

test("only explicit acceptance exposes a typed Map-item save offer", () => {
  assert.deepEqual(recognizedMapItemOffer(acceptedResponse), acceptedResponse.candidateMapItem);
  assert.equal(recognizedMapItemOffer({ ...acceptedResponse, userEvaluationStatus: "partial" }), null);
  assert.equal(recognizedMapItemOffer({ ...acceptedResponse, proposedMapAction: "NONE" }), null);
});

test("an awaiting candidate produces application-owned evaluation controls", () => {
  assert.deepEqual(candidateEvaluationOffer("message-1", awaitingCandidate), { messageId: "message-1", item: awaitingCandidate.candidateMapItem });
  assert.equal(candidateEvaluationOffer("message-1", acceptedResponse), null);
});

test("YES_EXACTLY validates without another model turn", () => {
  const evaluated = applyCandidateEvaluation(awaitingCandidate, "YES_EXACTLY");
  assert.equal(evaluated?.recognitionStage, "VALIDATED");
  assert.equal(evaluated?.proposedMapAction, "OFFER_SAVE");
  assert.deepEqual(recognizedMapItemOffer(evaluated), awaitingCandidate.candidateMapItem);
});

test("PARTLY preserves the typed candidate context", () => {
  const evaluated = applyCandidateEvaluation(awaitingCandidate, "PARTLY");
  assert.deepEqual(candidateEvaluationPromptContext(evaluated), { action: "PARTLY", candidateMapItem: awaitingCandidate.candidateMapItem, supportingObservations: awaitingCandidate.supportingObservations });
});

test("NO returns toward EXPLORE without a save offer", () => {
  const evaluated = applyCandidateEvaluation(awaitingCandidate, "NO");
  assert.equal(evaluated?.recognitionStage, "REJECTED");
  assert.equal(evaluated?.recommendedNextMode, "EXPLORE");
  assert.equal(recognizedMapItemOffer(evaluated), null);
});

test("LET_ME_EXPLAIN remains distinct from partial agreement", () => {
  const explain = applyCandidateEvaluation(awaitingCandidate, "LET_ME_EXPLAIN");
  assert.equal(candidateEvaluationPromptContext(explain)?.action, "LET_ME_EXPLAIN");
  assert.equal(candidateEvaluationOffer("message-1", explain), null);
});

test("hypothesis testing can continue without manufacturing a Map item", () => {
  const result = recognizeResponseSchema.safeParse({ ...acceptedResponse, reply: "One distinction is still unresolved.", recognitionStage: "HYPOTHESIS_TESTING", candidateMapItem: null, evidenceStrength: "limited", userEvaluationStatus: "awaiting", proposedMapAction: "NONE", recommendedNextMode: "RECOGNIZE" });
  assert.equal(result.success, true);
  assert.equal(result.success && recognizedMapItemOffer(result.data), null);
});

test("model output cannot claim application-owned validation", () => {
  const acceptedSignals = recognizeSignalsSchema.parse(acceptedResponse);
  const awaitingSignals = recognizeSignalsSchema.parse(awaitingCandidate);
  assert.equal(isValidGeneratedRecognizeSignals(awaitingSignals), true);
  assert.equal(isValidGeneratedRecognizeSignals(acceptedSignals), false);
});

test("accepted Pattern offers under the prior contract remain usable", () => {
  const legacy = { currentMode: "RECOGNIZE", candidatePattern: "When uncertainty rises, I seek more information.", userEvaluationStatus: "accepted", proposedMapAction: "OFFER_SAVE", recommendedNextMode: "PAUSE" };
  assert.deepEqual(recognizedMapItemOffer(legacy), { kind: "PATTERN", statement: legacy.candidatePattern });
});
