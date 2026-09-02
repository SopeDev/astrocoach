"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { locales } from "@/i18n/config";

const languageSelectionSchema = z.object({ locale: z.enum(locales) });

export async function selectLanguage(formData: FormData) {
  const result = languageSelectionSchema.safeParse({ locale: formData.get("locale") });

  if (!result.success) {
    redirect("/");
  }

  const { locale } = result.data;
  const cookieStore = await cookies();
  cookieStore.set("astrocoach-locale", locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  const session = await auth();

  if (session?.user?.id) {
    const { db } = await import("@/db/client");
    await db.user.update({ where: { id: session.user.id }, data: { locale } });
    redirect(`/${locale}/continue`);
  }

  redirect(`/${locale}/sign-in`);
}
