import assert from "node:assert/strict";
import test from "node:test";
import {
  ASTROCOACH_VOICE_INSTRUCTIONS,
  ASTROLOGY_COMMUNICATION_INSTRUCTIONS,
  ASTROLOGY_CONVERSATION_EXAMPLES,
} from "./astrology-context";

test("shared astrology prompt preserves the worldview and its evidence boundaries", () => {
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /primary symbolic and developmental framework/i);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /evolutionary and Kabbalistic/i);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /ASTROLOGY PROPOSES; LIVED EXPERIENCE DECIDES/);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /does not by itself establish[\s\S]*causation/i);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /consequential financial, medical, legal, relationship, or career action/i);
});

test("shared voice and examples encode human correction and holistic synthesis", () => {
  assert.match(ASTROCOACH_VOICE_INSTRUCTIONS, /trusted friend/i);
  assert.match(ASTROCOACH_VOICE_INSTRUCTIONS, /without automatically turning each one into a question/i);
  assert.match(ASTROCOACH_VOICE_INSTRUCTIONS, /visibly update the reading/i);
  assert.match(ASTROLOGY_CONVERSATION_EXAMPLES, /Holistic interpretation/);
  assert.match(ASTROLOGY_CONVERSATION_EXAMPLES, /Lived agreement deepens/);
  assert.match(ASTROLOGY_CONVERSATION_EXAMPLES, /Lived contradiction changes/);
});
