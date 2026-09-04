import { Map } from "lucide-react";
import { PatternList } from "@/components/pattern-list";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const messages = getDictionary(locale);
  const patterns = await db.pattern.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const activePatterns = patterns.filter((pattern) => !pattern.archivedAt);

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.map.title}</h1>
      <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{messages.map.description}</p>
      <section className="mt-8">
        {activePatterns.length ? <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{messages.map.patternsTitle}</h2> : <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center dark:border-slate-700"><Map aria-hidden="true" className="mx-auto size-7 text-violet-600 dark:text-violet-300" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{messages.map.emptyTitle}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.map.emptyDescription}</p></div>}
        <PatternList initialPatterns={patterns.map((pattern) => ({ id: pattern.id, statement: pattern.statement, archivedAt: pattern.archivedAt?.toISOString() ?? null }))} locale={locale} messages={messages.map} />
      </section>
    </main>
  );
}
