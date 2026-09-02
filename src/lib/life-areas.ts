export const LIFE_AREA_KEYS = [
  "relationships",
  "money",
  "career",
  "habits",
  "emotions",
  "family",
  "confidence",
  "spirituality",
  "health",
  "selfUnderstanding",
] as const;

export type LifeAreaKey = (typeof LIFE_AREA_KEYS)[number];
