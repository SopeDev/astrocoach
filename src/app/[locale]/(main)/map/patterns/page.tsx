import Link from "next/link";
import { ArrowLeft, Repeat2 } from "lucide-react";
import { PatternList } from "@/components/pattern-list";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function PatternsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const messages = getDictionary(locale);
  const patterns = await db.pattern.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const activePatterns = patterns.filter((pattern) => !pattern.archivedAt);

  return (
    <main>
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[var(--explore)] dark:text-slate-300" href={`/${locale}/map`}><ArrowLeft aria-hidden="true" className="size-4" />{messages.map.backToMap}</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.map.patternsTitle}</h1>
      <p className="mt-3 max-w-xl leading-7 text-slate-600 dark:text-slate-300">{messages.map.patternsPageDescription}</p>
      <section className="mt-8">
        {!activePatterns.length ? <div className="border-y border-[var(--line)] py-10 text-center"><Repeat2 aria-hidden="true" className="mx-auto size-7 text-[var(--recognition)]" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{messages.map.emptyTitle}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.map.emptyDescription}</p></div> : null}
        <PatternList initialPatterns={patterns.map((pattern) => ({ id: pattern.id, statement: pattern.statement, archivedAt: pattern.archivedAt?.toISOString() ?? null }))} locale={locale} messages={messages.map} />
      </section>
    </main>
  );
}
