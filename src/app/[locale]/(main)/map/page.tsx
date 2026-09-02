import { Map, Repeat2 } from "lucide-react";
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

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.map.title}</h1>
      <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{messages.map.description}</p>
      {patterns.length ? <section className="mt-8"><h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{messages.map.patternsTitle}</h2><div className="mt-3 space-y-3">{patterns.map((pattern) => <article className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/55" key={pattern.id}><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-700 dark:text-violet-300"><Repeat2 aria-hidden="true" className="size-4" />{messages.map.patternLabel}</div><p className="mt-3 leading-7 text-slate-800 dark:text-slate-100">{pattern.statement}</p></article>)}</div></section> : <div className="mt-10 rounded-3xl border border-dashed border-slate-300 p-7 text-center dark:border-slate-700"><Map aria-hidden="true" className="mx-auto size-7 text-violet-600 dark:text-violet-300" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{messages.map.emptyTitle}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.map.emptyDescription}</p></div>}
    </main>
  );
}
