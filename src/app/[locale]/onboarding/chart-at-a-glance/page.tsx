import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { completeChartAtAGlanceIntroduction } from "@/app/actions/chart";
import { ChartAtAGlance } from "@/components/chart-at-a-glance";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { chartAtAGlanceView } from "@/lib/chart-at-a-glance-view";
import { ensureNatalInterpretation } from "@/lib/natal-interpretation-persistence";

export default async function ChartAtAGlanceIntroductionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const messages = getDictionary(locale);
  const user = await requireCurrentUser(locale);
  const [intent, natalChart] = await Promise.all([
    db.initialIntent.findUnique({ where: { userId: user.id } }),
    db.natalChart.findUnique({ where: { userId: user.id } }),
  ]);
  if (!intent?.discoveryCompletedAt) redirect(`/${locale}/onboarding/discovery`);
  if (intent.orientationCompletedAt) redirect(`/${locale}/chart`);
  if (intent.chartAtAGlanceViewedAt) redirect(`/${locale}/onboarding/orientation`);
  if (!natalChart) redirect(`/${locale}/onboarding/intent`);

  const interpretation = await ensureNatalInterpretation(user.id, natalChart);
  const view = chartAtAGlanceView(interpretation, locale);

  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-14 sm:px-8 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8"><ThemeToggle label={messages.themeToggle} /></div>
      <section className="relative mx-auto w-full max-w-2xl">
        <header className="mb-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
            <Sparkles aria-hidden="true" className="size-5" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">{messages.chartIntroduction.eyebrow}</p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">{messages.chartIntroduction.title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty leading-7 text-slate-600 dark:text-slate-300">{messages.chartIntroduction.description}</p>
        </header>

        <ChartAtAGlance canStartConversation={false} locale={locale} messages={messages.chart} themes={view.themes} uncertain={view.uncertain} />

        <form action={completeChartAtAGlanceIntroduction.bind(null, locale)} className="mt-8">
          <p className="mb-3 text-center text-sm text-slate-500 dark:text-slate-400">{messages.chartIntroduction.returnNote}</p>
          <button className="min-h-12 w-full cursor-pointer rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500" type="submit">{messages.chartIntroduction.continue}</button>
        </form>
      </section>
    </main>
  );
}
