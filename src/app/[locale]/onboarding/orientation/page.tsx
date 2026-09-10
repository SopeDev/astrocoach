import { redirect } from "next/navigation";
import { OrientationFlow } from "@/components/orientation-flow";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function OrientationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const messages = getDictionary(locale);
  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  if (!intent?.discoveryCompletedAt) redirect(`/${locale}/onboarding/discovery`);
  if (intent.orientationCompletedAt) redirect(`/${locale}/home`);
  if (!intent.chartAtAGlanceViewedAt) redirect(`/${locale}/onboarding/chart-at-a-glance`);

  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-8 sm:px-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />
      <OrientationFlow locale={locale} messages={messages.orientation} />
    </main>
  );
}
