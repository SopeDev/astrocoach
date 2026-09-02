"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";

export type BirthDataFormState = {
  errors?: {
    birthDate?: string;
    birthTime?: string;
  };
};

const birthDataSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTimeUnknown: z.boolean(),
  birthTime: z.string(),
});

function isRealDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export async function saveBirthData(
  locale: Locale,
  _previousState: BirthDataFormState,
  formData: FormData,
): Promise<BirthDataFormState> {
  if (!isLocale(locale)) {
    redirect("/");
  }

  const result = birthDataSchema.safeParse({
    birthDate: formData.get("birthDate"),
    birthTimeUnknown: formData.get("birthTimeUnknown") === "on",
    birthTime: formData.get("birthTime") ?? "",
  });

  if (!result.success || !isRealDate(String(formData.get("birthDate") ?? ""))) {
    return { errors: { birthDate: "invalid" } };
  }

  const { birthDate, birthTimeUnknown, birthTime } = result.data;
  const today = new Date().toISOString().slice(0, 10);

  if (birthDate > today) {
    return { errors: { birthDate: "future" } };
  }

  let birthTimeMinutes: number | null = null;

  if (!birthTimeUnknown) {
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(birthTime);

    if (!timeMatch) {
      return { errors: { birthTime: "required" } };
    }

    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);

    if (hours > 23 || minutes > 59) {
      return { errors: { birthTime: "invalid" } };
    }

    birthTimeMinutes = hours * 60 + minutes;
  }

  const user = await requireCurrentUser(locale);

  await db.$transaction([
    db.birthProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        birthDate: new Date(`${birthDate}T00:00:00.000Z`),
        birthTimeMinutes,
      },
      update: {
        birthDate: new Date(`${birthDate}T00:00:00.000Z`),
        birthTimeMinutes,
        birthInstant: null,
        utcOffsetMinutes: null,
      },
    }),
    db.natalChart.deleteMany({ where: { userId: user.id } }),
  ]);

  redirect(`/${locale}/onboarding/birth-location`);
}
