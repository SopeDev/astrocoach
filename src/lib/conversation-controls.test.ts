import assert from "node:assert/strict";
import test from "node:test";
import { hasUnresolvedConversationControl } from "./conversation-controls";

const savedLegacyPattern = {
  currentMode: "RECOGNIZE",
  candidatePattern: "When resources feel scarce, I cut off nourishing pleasure.",
  userEvaluationStatus: "accepted",
  proposedMapAction: "OFFER_SAVE",
};

const proposedPractice = {
  currentMode: "INTEGRATE",
  integrationStage: "PRACTICE_PROPOSAL",
  usedAstrologyFactorIds: [],
  usedTransitIds: [],
  integrationIntention: "Notice care before scarcity decides for me.",
  knownCues: ["The first morning drink"],
  proposedJunction: "Before evaluating the day's resources.",
  proposedPractice: {
    purpose: "CREATE_SPACE",
    primitive: "PAUSE",
    instruction: "Pause for one pleasant sensation.",
    cue: "Your first morning drink.",
  },
  newLivedEvidence: null,
  mapItemRevisionSignal: false,
  recommendedNextMode: "INTEGRATE",
  reasonForRecommendation: "The proposal is waiting for a decision.",
};

test("only controls belonging to the current mode block conversation messages", () => {
  assert.equal(hasUnresolvedConversationControl("RECOGNIZE", savedLegacyPattern), true);
  assert.equal(hasUnresolvedConversationControl("INTEGRATE", savedLegacyPattern), false);
  assert.equal(hasUnresolvedConversationControl("INTEGRATE", proposedPractice), true);
  assert.equal(hasUnresolvedConversationControl("DEEP_EXPLORE", proposedPractice), false);
});
