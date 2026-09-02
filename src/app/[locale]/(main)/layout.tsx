import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ThemePreferenceSync } from "@/components/theme-preference-sync";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function MainAppLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  if (!intent?.discoveryCompletedAt) redirect(`/${locale}/onboarding/discovery`);
  if (!intent.orientationCompletedAt) redirect(`/${locale}/onboarding/orientation`);

  const messages = getDictionary(locale);
  const profileInitial = (user.name?.trim()[0] ?? user.email?.trim()[0] ?? "A").toUpperCase();

  return <AppShell locale={locale} messages={messages.appShell} profileInitial={profileInitial}><ThemePreferenceSync preference={user.theme} />{children}</AppShell>;
}
