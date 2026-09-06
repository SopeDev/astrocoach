import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedPracticeProposal, practiceProposalSchema } from "./practices";

test("accepts a small supported Practice primitive", () => {
  const proposal = practiceProposalSchema.parse({ purpose: "NOTICE_EARLIER", primitive: "NAME_CUE", instruction: "Name the tightening when it starts.", cue: "Your shoulders tighten." });
  assert.equal(isSupportedPracticeProposal(proposal), true);
});

test("rejects unsupported purpose and primitive pairings", () => {
  const proposal = practiceProposalSchema.parse({ purpose: "CREATE_SPACE", primitive: "NOTE_AFTERWARD", instruction: "Write later.", cue: "Afterward." });
  assert.equal(isSupportedPracticeProposal(proposal), false);
});
