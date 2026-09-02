import "server-only";

import { db } from "@/db/client";
import type { Locale } from "@/i18n/config";

export async function getUserLandingPath(locale: Locale, userId: string) {
  const [profile, intent] = await Promise.all([
    db.birthProfile.findUnique({ where: { userId } }),
    db.initialIntent.findUnique({ where: { userId } }),
  ]);

  if (intent?.orientationCompletedAt) return `/${locale}/home`;
  if (intent?.discoveryCompletedAt) return `/${locale}/onboarding/orientation`;
  if (intent?.discoveryQuestions) return `/${locale}/onboarding/discovery`;
  if (profile?.geonameId && profile.timezoneId) return `/${locale}/onboarding/intent`;
  if (profile) return `/${locale}/onboarding/birth-location`;
  return `/${locale}/onboarding/birth-data`;
}
