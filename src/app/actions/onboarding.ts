"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { locales } from "@/i18n/config";
import { DEVELOPMENT_USER_EMAIL } from "@/lib/development-user";

const languageSelectionSchema = z.object({ locale: z.enum(locales) });

export async function selectLanguage(formData: FormData) {
  const result = languageSelectionSchema.safeParse({ locale: formData.get("locale") });

  if (!result.success) {
    redirect("/");
  }

  const { locale } = result.data;
  const { db } = await import("@/db/client");

  await db.user.update({
    where: { email: DEVELOPMENT_USER_EMAIL },
    data: { locale },
  });

  const cookieStore = await cookies();
  cookieStore.set("astrocoach-locale", locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect(`/${locale}/onboarding/birth-data`);
}
