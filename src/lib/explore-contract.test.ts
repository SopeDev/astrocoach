import assert from "node:assert/strict";
import test from "node:test";
import { exploreMessageSchema, exploreResponseSchema, titleFromExploreMessage } from "./explore-contract";

test("EXPLORE output keeps the visible reply separate from valid internal signals", () => {
  const result = exploreResponseSchema.safeParse({
    reply: "What felt most important about that moment?",
    currentMode: "EXPLORE",
    responseApproach: "QUESTION",
    questionPurpose: "Clarify what mattered most.",
    privateAstrologyInfluence: null,
    understandingStatus: "opening",
    importantObservations: ["The user described a recent decision."],
    unresolvedQuestions: ["What outcome were they hoping for?"],
    candidatePatternSignal: false,
    candidatePatternConfidence: 0.1,
    recommendedNextMode: "EXPLORE",
    reasonForRecommendation: "Important context is still missing.",
  });

  assert.equal(result.success, true);
});

test("EXPLORE rejects invalid mode signals and empty messages", () => {
  assert.equal(exploreMessageSchema.safeParse("   ").success, false);
  assert.equal(exploreResponseSchema.safeParse({ reply: "Hello", currentMode: "ADVISE" }).success, false);
});

test("conversation titles are compact and single-line", () => {
  const title = titleFromExploreMessage("A long thought\nwith extra spacing ".repeat(8));
  assert.equal(title.includes("\n"), false);
  assert.ok(title.length <= 80);
  assert.ok(title.endsWith("…"));
});
