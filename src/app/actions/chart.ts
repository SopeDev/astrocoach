"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";

export async function completeChartAtAGlanceIntroduction(locale: Locale) {
  if (!isLocale(locale)) redirect("/");

  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  if (!intent?.discoveryCompletedAt) redirect(`/${locale}/onboarding/discovery`);
  if (intent.orientationCompletedAt) redirect(`/${locale}/chart`);

  await db.initialIntent.update({
    where: { id: intent.id },
    data: { chartAtAGlanceViewedAt: intent.chartAtAGlanceViewedAt ?? new Date() },
  });
  redirect(`/${locale}/onboarding/orientation`);
}
