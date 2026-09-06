"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb, LoaderCircle, Repeat2, Sprout } from "lucide-react";
import { startIntegration } from "@/app/actions/explore";
import type { Locale } from "@/i18n/config";
import type { MapItemKind } from "@/lib/recognize-contract";

type ActivePractice = { id: string; conversationId: string | null; instruction: string; cue: string } | null;

type Messages = {
  patternLabel: string;
  insightLabel: string;
  integrationActionTitle: string;
  integrationActionDescription: string;
  integrationIntentionLabel: string;
  integrationIntentionPlaceholder: string;
  startIntegration: string;
  startingIntegration: string;
  activePracticeTitle: string;
  practiceCueLabel: string;
  returnToIntegration: string;
  actionError: string;
};

export function MapItemDetail({ locale, item, activePractice, messages }: { locale: Locale; item: { id: string; kind: MapItemKind; statement: string; archived: boolean }; activePractice: ActivePractice; messages: Messages }) {
  const router = useRouter();
  const [intention, setIntention] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const ItemIcon = item.kind === "PATTERN" ? Repeat2 : Lightbulb;

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = intention.trim();
    if (!value || pending || item.archived) return;
    setError(false);
    startTransition(async () => {
      const result = await startIntegration(locale, item.id, value);
      if (result.conversationId) {
        router.push(`/${locale}/explore/${result.conversationId}`);
        return;
      }
      setError(true);
    });
  }

  return (
    <>
      <article className="mt-8 rounded-3xl border border-slate-200 bg-white/75 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-700 dark:text-violet-300"><ItemIcon aria-hidden="true" className="size-4" />{item.kind === "PATTERN" ? messages.patternLabel : messages.insightLabel}</div>
        <p className="mt-4 text-lg leading-8 text-slate-900 dark:text-slate-100">{item.statement}</p>
      </article>
      {activePractice ? (
        <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
          <Sprout aria-hidden="true" className="size-5 text-emerald-700 dark:text-emerald-300" />
          <h2 className="mt-3 font-semibold text-slate-950 dark:text-white">{messages.activePracticeTitle}</h2>
          <p className="mt-2 leading-7 text-slate-800 dark:text-slate-100">{activePractice.instruction}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold">{messages.practiceCueLabel}:</span> {activePractice.cue}</p>
          {activePractice.conversationId ? <Link className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white" href={`/${locale}/explore/${activePractice.conversationId}`}>{messages.returnToIntegration}</Link> : null}
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/40">
          <Sprout aria-hidden="true" className="size-5 text-violet-700 dark:text-violet-300" />
          <h2 className="mt-3 font-semibold text-slate-950 dark:text-white">{messages.integrationActionTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.integrationActionDescription}</p>
          <form className="mt-4" onSubmit={submit}>
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="integration-intention">{messages.integrationIntentionLabel}</label>
            <textarea className="mt-2 min-h-28 w-full rounded-xl border border-violet-200 bg-white px-3 py-3 text-base leading-7 text-slate-950 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-violet-800 dark:bg-slate-950 dark:text-white" disabled={pending || item.archived} id="integration-intention" maxLength={300} onChange={(event) => { setIntention(event.target.value); setError(false); }} placeholder={messages.integrationIntentionPlaceholder} value={intention} />
            <button className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:opacity-60 dark:bg-violet-600" disabled={pending || item.archived || !intention.trim()} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}{pending ? messages.startingIntegration : messages.startIntegration}</button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{messages.actionError}</p> : null}
        </section>
      )}
    </>
  );
}
