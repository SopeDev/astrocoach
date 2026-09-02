"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { resolveBirthInstant } from "@/lib/birth-timezone";
import { getPlace, getTimezone } from "@/lib/geonames";

export type BirthLocationFormState = { error?: "required" | "service" };

const selectionSchema = z.coerce.number().int().positive();

export async function saveBirthLocation(
  locale: Locale,
  _previousState: BirthLocationFormState,
  formData: FormData,
): Promise<BirthLocationFormState> {
  if (!isLocale(locale)) {
    redirect("/");
  }

  const selectedId = selectionSchema.safeParse(formData.get("geonameId"));

  if (!selectedId.success) {
    return { error: "required" };
  }

  const user = await requireCurrentUser(locale);
  const birthProfile = await db.birthProfile.findUnique({ where: { userId: user.id } });

  if (!birthProfile) {
    redirect(`/${locale}/onboarding/birth-data`);
  }

  try {
    const place = await getPlace(selectedId.data, locale);
    const timezoneId = await getTimezone(place.lat, place.lng);
    const historicalTime = resolveBirthInstant({
      birthDate: birthProfile.birthDate,
      birthTimeMinutes: birthProfile.birthTimeMinutes,
      timezoneId,
    });
    await db.birthProfile.update({
      where: { id: birthProfile.id },
      data: {
        geonameId: place.geonameId,
        locationName: place.name,
        adminName: place.adminName1 ?? null,
        countryName: place.countryName,
        countryCode: place.countryCode,
        latitude: place.lat,
        longitude: place.lng,
        timezoneId,
        ...historicalTime,
      },
    });
  } catch (error) {
    console.error("Saving birth location failed", error);
    return { error: "service" };
  }

  redirect(`/${locale}/onboarding/intent`);
}
