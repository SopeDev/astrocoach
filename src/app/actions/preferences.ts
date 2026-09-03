"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { locales } from "@/i18n/config";
import { astrologyFamiliaritySchema, astrologyStyleSchema } from "@/lib/astrology-preferences";

const themeSchema = z.enum(["system", "light", "dark"]);
const localeSchema = z.enum(locales);

export async function persistThemePreference(value: string) {
  const theme = themeSchema.safeParse(value);
  const session = await auth();

  if (!theme.success || !session?.user?.id) return { ok: false as const };

  try {
    await db.user.update({ where: { id: session.user.id }, data: { theme: theme.data } });
    return { ok: true as const };
  } catch (error) {
    console.error("Saving theme preference failed", error);
    return { ok: false as const };
  }
}

export async function persistAstrologyPreferences(familiarityValue: string, styleValue: string) {
  const astrologyFamiliarity = astrologyFamiliaritySchema.safeParse(familiarityValue);
  const astrologyStyle = astrologyStyleSchema.safeParse(styleValue);
  const session = await auth();

  if (!astrologyFamiliarity.success || !astrologyStyle.success || !session?.user?.id) return { ok: false as const };

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { astrologyFamiliarity: astrologyFamiliarity.data, astrologyStyle: astrologyStyle.data },
    });
    return { ok: true as const };
  } catch (error) {
    console.error("Saving astrology preferences failed", error);
    return { ok: false as const };
  }
}

export async function changeLanguagePreference(formData: FormData) {
  const parsed = localeSchema.safeParse(formData.get("locale"));
  if (!parsed.success) return;

  const session = await auth();
  if (!session?.user?.id) redirect(`/${parsed.data}/sign-in`);

  await db.user.update({ where: { id: session.user.id }, data: { locale: parsed.data } });
  const cookieStore = await cookies();
  cookieStore.set("astrocoach-locale", parsed.data, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect(`/${parsed.data}/account`);
}
