"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { resolveBirthInstant } from "@/lib/birth-timezone";
import { getPlace, getTimezone } from "@/lib/geonames";
import { calculateNatalChart, NATAL_ENGINE, NATAL_ENGINE_VERSION, NATAL_SCHEMA_VERSION } from "@/lib/natal-chart";

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
    const calculation = calculateNatalChart({
      birthDate: birthProfile.birthDate,
      birthTimeMinutes: birthProfile.birthTimeMinutes,
      latitude: place.lat,
      longitude: place.lng,
      timezoneId,
    });
    const calculatedAt = new Date();

    await db.$transaction([
      db.birthProfile.update({
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
          updatedAt: calculatedAt,
          ...historicalTime,
        },
      }),
      db.natalChart.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          engine: NATAL_ENGINE,
          engineVersion: NATAL_ENGINE_VERSION,
          schemaVersion: NATAL_SCHEMA_VERSION,
          inputHash: calculation.inputHash,
          timeAccuracy: calculation.timeAccuracy,
          houseSystem: calculation.houseSystem,
          sourceProfileUpdated: calculatedAt,
          calculatedAt,
          data: calculation.data,
        },
        update: {
          engine: NATAL_ENGINE,
          engineVersion: NATAL_ENGINE_VERSION,
          schemaVersion: NATAL_SCHEMA_VERSION,
          inputHash: calculation.inputHash,
          timeAccuracy: calculation.timeAccuracy,
          houseSystem: calculation.houseSystem,
          sourceProfileUpdated: calculatedAt,
          calculatedAt,
          data: calculation.data,
        },
      }),
    ]);
  } catch (error) {
    console.error("Saving birth location failed", error);
    return { error: "service" };
  }

  redirect(`/${locale}/onboarding/chart-review`);
}
