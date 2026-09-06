import Link from "next/link";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { MapItemList } from "@/components/map-item-list";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function InsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const messages = getDictionary(locale);
  const insights = await db.mapItem.findMany({ where: { userId: user.id, kind: "INSIGHT" }, orderBy: { createdAt: "desc" } });
  const activeInsights = insights.filter((insight) => !insight.archivedAt);

  return <main><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[var(--explore)] dark:text-slate-300" href={`/${locale}/map`}><ArrowLeft aria-hidden="true" className="size-4" />{messages.map.backToMap}</Link><h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.map.insightsTitle}</h1><p className="mt-3 max-w-xl leading-7 text-slate-600 dark:text-slate-300">{messages.map.insightsPageDescription}</p><section className="mt-8">{!activeInsights.length ? <div className="border-y border-[var(--line)] py-10 text-center"><Lightbulb aria-hidden="true" className="mx-auto size-7 text-[var(--natal)]" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{messages.map.emptyTitle}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.map.emptyDescription}</p></div> : null}<MapItemList initialItems={insights.map((insight) => ({ id: insight.id, kind: insight.kind, statement: insight.statement, archivedAt: insight.archivedAt?.toISOString() ?? null }))} locale={locale} messages={messages.map} /></section></main>;
}
