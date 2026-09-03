"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import {
  discoveryAnswersSchema,
  discoveryQuestionsSchema,
  finalDiscoveryAnswersSchema,
  finalDiscoveryQuestionsSchema,
  generateFinalDiscoveryQuestions,
  type DiscoveryChartData,
} from "@/lib/initial-discovery";
import { LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/life-areas";

export type FinalQuestionResult = { questions?: string[]; error?: "answers" | "service" };
export type CompleteDiscoveryResult = { completed?: boolean; error?: "answers" | "service" };

function parseLifeAreaKeys(values: string[]) {
  return values.flatMap((value) => {
    const parsed = z.enum(LIFE_AREA_KEYS).safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function prepareFinalDiscoveryQuestions(locale: Locale, answers: string[]): Promise<FinalQuestionResult> {
  if (!isLocale(locale)) return { error: "service" };

  const parsedAnswers = discoveryAnswersSchema.safeParse(answers);
  if (!parsedAnswers.success) return { error: "answers" };

  const user = await requireCurrentUser(locale);
  const [intent, natalChart] = await Promise.all([
    db.initialIntent.findUnique({ where: { userId: user.id } }),
    db.natalChart.findUnique({ where: { userId: user.id } }),
  ]);
  const initialQuestions = discoveryQuestionsSchema.safeParse(intent?.discoveryQuestions);
  const existingFinalQuestions = finalDiscoveryQuestionsSchema.safeParse(intent?.finalQuestions);

  if (existingFinalQuestions.success) return { questions: existingFinalQuestions.data };
  if (!intent || !natalChart || !initialQuestions.success) return { error: "service" };

  try {
    const messages = getDictionary(locale);
    const lifeAreaKeys = parseLifeAreaKeys(intent.lifeAreas);
    const areaLabels = lifeAreaKeys.map((key: LifeAreaKey) => messages.initialIntent.areas[key]);
    const questions = await generateFinalDiscoveryQuestions({
      locale,
      areaLabels,
      currentContext: intent.currentContext,
      chart: natalChart.data as unknown as DiscoveryChartData,
      astrologyFamiliarity: user.astrologyFamiliarity,
      astrologyStyle: user.astrologyStyle,
      initialQuestions: initialQuestions.data,
      initialAnswers: parsedAnswers.data,
    });

    await db.initialIntent.update({
      where: { id: intent.id },
      data: { initialAnswers: parsedAnswers.data, finalQuestions: questions },
    });

    return { questions };
  } catch (error) {
    console.error("Preparing final discovery questions failed", error);
    return { error: "service" };
  }
}

export async function completeInitialDiscovery(locale: Locale, answers: string[]): Promise<CompleteDiscoveryResult> {
  if (!isLocale(locale)) return { error: "service" };

  const parsedAnswers = finalDiscoveryAnswersSchema.safeParse(answers);
  if (!parsedAnswers.success) return { error: "answers" };

  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  const finalQuestions = finalDiscoveryQuestionsSchema.safeParse(intent?.finalQuestions);

  if (!intent || !finalQuestions.success) return { error: "service" };

  try {
    await db.initialIntent.update({
      where: { id: intent.id },
      data: { finalAnswers: parsedAnswers.data, discoveryCompletedAt: new Date() },
    });
    return { completed: true };
  } catch (error) {
    console.error("Completing initial discovery failed", error);
    return { error: "service" };
  }
}
