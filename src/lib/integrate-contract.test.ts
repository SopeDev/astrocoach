import assert from "node:assert/strict";
import test from "node:test";
import { applyPracticeActivation, integrateResponseSchema, livedEvidenceFromIntegrate, practiceProposalOffer, shouldOfferMapItemRevision } from "./integrate-contract";

const proposalResponse = {
  reply: "Try naming the tightening when it first arrives.",
  currentMode: "INTEGRATE",
  integrationStage: "PRACTICE_PROPOSAL",
  integrationIntention: "Notice the pattern before reacting.",
  knownCues: ["Tight shoulders"],
  proposedJunction: "The first shoulder tension before reaching for reassurance.",
  proposedPractice: { purpose: "NOTICE_EARLIER", primitive: "NAME_CUE", instruction: "Silently say, ‘the tightening is here.’", cue: "Your shoulders first tighten." },
  newLivedEvidence: null,
  mapItemRevisionSignal: false,
  recommendedNextMode: "PAUSE",
  reasonForRecommendation: "One Practice is ready for life.",
};

test("INTEGRATE proposes exactly one bounded Practice", () => {
  assert.equal(integrateResponseSchema.safeParse(proposalResponse).success, true);
  assert.deepEqual(practiceProposalOffer("message", proposalResponse)?.proposal, proposalResponse.proposedPractice);
});

test("activation consumes the proposal", () => {
  const activated = applyPracticeActivation(proposalResponse, "4f692409-3ad9-4ec6-b4de-7e251c418d45");
  assert.equal(practiceProposalOffer("message", activated), null);
});

test("a life observation exposes new evidence separately", () => {
  assert.equal(livedEvidenceFromIntegrate({ ...proposalResponse, integrationStage: "LIFE_OBSERVATION", proposedPractice: null, newLivedEvidence: "The cue appeared as jaw tension before the urge." }), "The cue appeared as jaw tension before the urge.");
});

test("contradictory lived evidence can offer renewed recognition", () => {
  assert.equal(shouldOfferMapItemRevision({ ...proposalResponse, integrationStage: "LIFE_OBSERVATION", proposedPractice: null, newLivedEvidence: "The expected sequence did not occur.", mapItemRevisionSignal: true, recommendedNextMode: "RECOGNIZE" }), true);
  assert.equal(shouldOfferMapItemRevision({ ...proposalResponse, integrationStage: "LIFE_OBSERVATION", proposedPractice: null, newLivedEvidence: "The cue worked as expected." }), false);
});
