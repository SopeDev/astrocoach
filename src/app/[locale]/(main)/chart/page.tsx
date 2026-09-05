import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ChartAtAGlance } from "@/components/chart-at-a-glance";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { chartAtAGlanceView } from "@/lib/chart-at-a-glance-view";
import { ensureNatalInterpretation } from "@/lib/natal-interpretation-persistence";

export default async function ChartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const messages = getDictionary(locale);
  const user = await requireCurrentUser(locale);
  const natalChart = await db.natalChart.findUnique({ where: { userId: user.id } });
  if (!natalChart) redirect(`/${locale}/onboarding/intent`);

  const interpretation = await ensureNatalInterpretation(user.id, natalChart);
  const view = chartAtAGlanceView(interpretation, locale);

  return (
    <main>
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-300" href={`/${locale}/map`}><ArrowLeft aria-hidden="true" className="size-4" />{messages.map.backToMap}</Link>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">{messages.chart.eyebrow}</p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.chart.title}</h1>
      <p className="mt-3 max-w-xl leading-7 text-slate-600 dark:text-slate-300">{messages.chart.description}</p>
      <div className="mt-8">
        <ChartAtAGlance canStartConversation locale={locale} messages={messages.chart} themes={view.themes} uncertain={view.uncertain} />
      </div>
    </main>
  );
}
