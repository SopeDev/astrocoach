"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { practiceCueSchema, practiceIdSchema, practiceInstructionSchema } from "@/lib/practices";

function revalidatePracticeViews(locale: Locale, mapItemId?: string) {
  revalidatePath(`/${locale}/map`);
  revalidatePath(`/${locale}/map/practices`);
  if (mapItemId) revalidatePath(`/${locale}/map/${mapItemId}`);
}

export async function updatePractice(locale: Locale, practiceId: string, instruction: string, cue: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = practiceIdSchema.safeParse(practiceId);
  const parsedInstruction = practiceInstructionSchema.safeParse(instruction);
  const parsedCue = practiceCueSchema.safeParse(cue);
  if (!parsedId.success || !parsedInstruction.success || !parsedCue.success) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const practice = await db.practice.findFirst({ where: { id: parsedId.data, userId: user.id, status: { not: "ARCHIVED" } } });
  if (!practice) return { ok: false as const };
  await db.practice.update({ where: { id: practice.id }, data: { instruction: parsedInstruction.data, cue: parsedCue.data } });
  revalidatePracticeViews(locale, practice.mapItemId);
  return { ok: true as const, instruction: parsedInstruction.data, cue: parsedCue.data };
}

export async function archivePractice(locale: Locale, practiceId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = practiceIdSchema.safeParse(practiceId);
  if (!parsedId.success) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const practice = await db.practice.findFirst({ where: { id: parsedId.data, userId: user.id, status: { not: "ARCHIVED" } } });
  if (!practice) return { ok: false as const };
  await db.practice.update({ where: { id: practice.id }, data: { status: "ARCHIVED" } });
  revalidatePracticeViews(locale, practice.mapItemId);
  return { ok: true as const };
}

export async function restorePractice(locale: Locale, practiceId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = practiceIdSchema.safeParse(practiceId);
  if (!parsedId.success) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const practice = await db.practice.findFirst({ where: { id: parsedId.data, userId: user.id, status: { in: ["PAUSED", "ARCHIVED"] } } });
  if (!practice) return { ok: false as const };
  await db.$transaction([
    db.practice.updateMany({ where: { userId: user.id, mapItemId: practice.mapItemId, status: "ACTIVE" }, data: { status: "PAUSED" } }),
    db.practice.update({ where: { id: practice.id }, data: { status: "ACTIVE" } }),
  ]);
  revalidatePracticeViews(locale, practice.mapItemId);
  return { ok: true as const };
}
