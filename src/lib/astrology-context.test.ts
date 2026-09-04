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
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /Keep this epistemic standard private/i);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /Do not routinely announce the evolutionary\/Kabbalistic framework/i);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /does not by itself establish[\s\S]*causation/i);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /consequential financial, medical, legal, relationship, or career action/i);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /privateInterpretationContext/);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /symbolic_hypothesis_not_user_evidence/);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /must never appear in supportingObservations/i);
  assert.match(ASTROLOGY_COMMUNICATION_INSTRUCTIONS, /hypotheses, not known traits/i);
});

test("shared voice and examples encode human correction and holistic synthesis", () => {
  assert.match(ASTROCOACH_VOICE_INSTRUCTIONS, /trusted friend/i);
  assert.match(ASTROCOACH_VOICE_INSTRUCTIONS, /Begin with the substance/i);
  assert.match(ASTROCOACH_VOICE_INSTRUCTIONS, /without automatically turning each one into a question/i);
  assert.match(ASTROCOACH_VOICE_INSTRUCTIONS, /visibly update the reading/i);
  assert.match(ASTROLOGY_CONVERSATION_EXAMPLES, /Holistic interpretation/);
  assert.match(ASTROLOGY_CONVERSATION_EXAMPLES, /Lived agreement deepens/);
  assert.match(ASTROLOGY_CONVERSATION_EXAMPLES, /Lived contradiction changes/);
});
