import assert from "node:assert/strict";
import test from "node:test";
import { astrologyRetrievalState } from "./astrology-retrieval-state";

test("retrieval state keeps explicit continuity fields and omits orchestration prose", () => {
  const state = astrologyRetrievalState({
    focalMapItem: { statement: "I defer closeness until I feel financially secure." },
    latestAssistantSignals: {
      currentMode: "EXPLORE",
      candidateMapItemStatement: "Play helps me stay connected while I build stability.",
      importantObservations: ["Scarcity narrows the user's space for affection."],
      unresolvedQuestions: ["How much is logistics and how much is a personal rule?"],
      reasonForRecommendation: "relationships money career habits self-understanding",
      privateAstrologyInfluence: "Every chart topic was considered.",
    },
  });

  assert.ok(state?.includes("financially secure"));
  assert.ok(state?.includes("Play helps me"));
  assert.equal(state?.includes("Every chart topic"), false);
  assert.equal(state?.includes("reasonForRecommendation"), false);
});

test("retrieval state ignores unrecognized assistant payloads", () => {
  const state = astrologyRetrievalState({
    latestAssistantSignals: { arbitrary: "relationships money career habits" },
  });

  assert.equal(state, null);
});
