import Link from "next/link";
import { ArrowLeft, Sprout } from "lucide-react";
import { PracticeList } from "@/components/practice-list";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function PracticesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const messages = getDictionary(locale);
  const practices = await db.practice.findMany({ where: { userId: user.id }, include: { mapItem: true }, orderBy: { createdAt: "desc" } });
  const visiblePractices = practices.filter((practice) => practice.status !== "ARCHIVED");

  return <main><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[var(--explore)] dark:text-slate-300" href={`/${locale}/map`}><ArrowLeft aria-hidden="true" className="size-4" />{messages.map.backToMap}</Link><h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.map.practicesTitle}</h1><p className="mt-3 max-w-xl leading-7 text-slate-600 dark:text-slate-300">{messages.map.practicesPageDescription}</p><section className="mt-8">{!visiblePractices.length ? <div className="border-y border-[var(--line)] py-10 text-center"><Sprout aria-hidden="true" className="mx-auto size-7 text-[var(--explore)]" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{messages.map.emptyTitle}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.map.practicesEmpty}</p></div> : null}<PracticeList initialPractices={practices.map((practice) => ({ id: practice.id, mapItemId: practice.mapItemId, conversationId: practice.conversationId, instruction: practice.instruction, cue: practice.cue, status: practice.status, mapItemStatement: practice.mapItem.statement }))} locale={locale} messages={messages.map} /></section></main>;
}
