"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { generateInitialDiscoveryQuestions } from "@/lib/initial-discovery";
import { LIFE_AREA_KEYS } from "@/lib/life-areas";
import { calculateNatalChart, NATAL_ENGINE, NATAL_ENGINE_VERSION, NATAL_SCHEMA_VERSION } from "@/lib/natal-chart";

export type InitialIntentFormState = { error?: "areas" | "context" | "service" };

const intentSchema = z.object({
  lifeAreas: z.array(z.enum(LIFE_AREA_KEYS)).min(1).max(LIFE_AREA_KEYS.length),
  currentContext: z.string().trim().max(2000),
});

export async function saveInitialIntent(
  locale: Locale,
  _previousState: InitialIntentFormState,
  formData: FormData,
): Promise<InitialIntentFormState> {
  if (!isLocale(locale)) redirect("/");

  const result = intentSchema.safeParse({
    lifeAreas: formData.getAll("lifeAreas"),
    currentContext: formData.get("currentContext") ?? "",
  });

  if (!result.success) {
    const contextInvalid = result.error.issues.some((issue) => issue.path[0] === "currentContext");
    return { error: contextInvalid ? "context" : "areas" };
  }

  const user = await requireCurrentUser(locale);
  const profile = await db.birthProfile.findUnique({ where: { userId: user.id } });

  if (!profile?.latitude || !profile.longitude || !profile.timezoneId) {
    redirect(`/${locale}/onboarding/birth-location`);
  }

  try {
    const startedAt = Date.now();
    const calculation = calculateNatalChart({
      birthDate: profile.birthDate,
      birthTimeMinutes: profile.birthTimeMinutes,
      latitude: Number(profile.latitude),
      longitude: Number(profile.longitude),
      timezoneId: profile.timezoneId,
    });
    const messages = getDictionary(locale);
    const areaLabels = result.data.lifeAreas.map((key) => messages.initialIntent.areas[key]);
    const questions = await generateInitialDiscoveryQuestions({
      locale,
      areaLabels,
      currentContext: result.data.currentContext || null,
      chart: calculation.data,
    });
    const remainingTransitionTime = Math.max(0, 2800 - (Date.now() - startedAt));
    await new Promise((resolve) => setTimeout(resolve, remainingTransitionTime));
    const calculatedAt = new Date();

    await db.$transaction([
      db.natalChart.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id, engine: NATAL_ENGINE, engineVersion: NATAL_ENGINE_VERSION,
          schemaVersion: NATAL_SCHEMA_VERSION, inputHash: calculation.inputHash,
          timeAccuracy: calculation.timeAccuracy, houseSystem: calculation.houseSystem,
          sourceProfileUpdated: profile.updatedAt, calculatedAt, data: calculation.data,
        },
        update: {
          engine: NATAL_ENGINE, engineVersion: NATAL_ENGINE_VERSION,
          schemaVersion: NATAL_SCHEMA_VERSION, inputHash: calculation.inputHash,
          timeAccuracy: calculation.timeAccuracy, houseSystem: calculation.houseSystem,
          sourceProfileUpdated: profile.updatedAt, calculatedAt, data: calculation.data,
        },
      }),
      db.initialIntent.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          lifeAreas: result.data.lifeAreas,
          currentContext: result.data.currentContext || null,
          discoveryQuestions: questions,
          initialAnswers: [],
          finalQuestions: [],
          finalAnswers: [],
          discoveryCompletedAt: null,
          questionsGenerated: calculatedAt,
        },
        update: {
          lifeAreas: result.data.lifeAreas,
          currentContext: result.data.currentContext || null,
          discoveryQuestions: questions,
          initialAnswers: [],
          finalQuestions: [],
          finalAnswers: [],
          discoveryCompletedAt: null,
          questionsGenerated: calculatedAt,
        },
      }),
    ]);
  } catch (error) {
    console.error("Preparing initial discovery failed", error);
    return { error: "service" };
  }

  redirect(`/${locale}/onboarding/discovery`);
}
