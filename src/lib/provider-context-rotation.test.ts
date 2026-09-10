import assert from "node:assert/strict";
import test from "node:test";
import {
  chatPromptCacheKey,
  shouldRotateProviderContext,
} from "./provider-context-rotation";

const now = new Date("2026-09-09T12:00:00.000Z");

test("provider context rotates after three generations or an expired cache window", () => {
  assert.equal(shouldRotateProviderContext({
    initializedAt: new Date("2026-09-09T11:55:00.000Z"),
    lastAssistantAt: new Date("2026-09-09T11:59:00.000Z"),
    generationsSinceInitialization: 2,
    now,
  }), false);
  assert.equal(shouldRotateProviderContext({
    initializedAt: new Date("2026-09-09T11:55:00.000Z"),
    lastAssistantAt: new Date("2026-09-09T11:59:00.000Z"),
    generationsSinceInitialization: 3,
    now,
  }), true);
  assert.equal(shouldRotateProviderContext({
    initializedAt: new Date("2026-09-09T10:00:00.000Z"),
    lastAssistantAt: new Date("2026-09-09T11:30:00.000Z"),
    generationsSinceInitialization: 1,
    now,
  }), true);
  assert.equal(shouldRotateProviderContext({
    initializedAt: new Date("2026-09-09T11:55:00.000Z"),
    lastAssistantAt: new Date("2026-09-09T10:00:00.000Z"),
    generationsSinceInitialization: 0,
    now,
  }), false);
});

test("cache keys are stable, scoped to one application conversation, and API-safe", () => {
  const key = chatPromptCacheKey("4083411a-20fd-4cd2-b256-df8d11533f6f");
  assert.equal(key, "astrocoach:4083411a-20fd-4cd2-b256-df8d11533f6f");
  assert.ok(key.length <= 64);
});
