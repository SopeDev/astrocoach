import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db/client";
import type { Locale } from "@/i18n/config";

export const getCurrentUser = cache(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return db.user.findUnique({ where: { id: session.user.id } });
});

export async function requireCurrentUser(locale: Locale) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  const selectedLocale = (await cookies()).get("astrocoach-locale")?.value;

  if (selectedLocale === locale && user.locale !== locale) {
    const hasStartedOnboarding = await db.initialIntent.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!hasStartedOnboarding) {
      return db.user.update({ where: { id: user.id }, data: { locale } });
    }
  }

  return user;
}
