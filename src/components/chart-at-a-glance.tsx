"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LoaderCircle,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import { sendExploreMessage } from "@/app/actions/explore";
import type { Locale } from "@/i18n/config";
import type { ChartThemeView } from "@/lib/chart-at-a-glance-view";

type ChartMessages = {
  foundationsTitle: string;
  emergentTitle: string;
  slotLabels: Record<ChartThemeView["slot"], string>;
  unknownTimeTitle: string;
  unknownTimeDescription: string;
  details: string;
  possibleExpressions: string;
  supportingFactors: string;
  explore: string;
  closeComposer: string;
  prompt: string;
  promptPlaceholder: string;
  suggestions: string[];
  startConversation: string;
  openingConversation: string;
  conversationError: string;
};

function ThemeCard({
  locale,
  messages,
  theme,
  canStartConversation,
}: {
  locale: Locale;
  messages: ChartMessages;
  theme: ChartThemeView;
  canStartConversation: boolean;
}) {
  const router = useRouter();
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;
    setError(false);
    startTransition(async () => {
      const result = await sendExploreMessage(locale, null, content, theme.id);
      if (result.conversationId) {
        router.push(`/${locale}/explore/${result.conversationId}`);
      } else {
        setError(true);
      }
    });
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
          <Sparkles aria-hidden="true" className="size-3.5" />
          {messages.slotLabels[theme.slot]}
        </div>
        <h2 className="mt-3 text-balance text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {theme.title}
        </h2>
        <p className="mt-3 text-pretty leading-7 text-slate-600 dark:text-slate-300">
          {theme.synthesis}
        </p>

        <details className="group mt-5 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-700 marker:hidden dark:text-slate-200">
            {messages.details}
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition group-open:rotate-180" />
          </summary>
          <div className="pb-1 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {messages.possibleExpressions}
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {theme.possibleExpressions.map((expression) => (
                <li className="flex gap-3" key={expression}>
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-500" />
                  <span>{expression}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {messages.supportingFactors}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {theme.supportingFactors.map((factor) => (
                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 dark:bg-violet-950/70 dark:text-violet-200" key={factor}>
                  {factor}
                </span>
              ))}
            </div>
          </div>
        </details>

        {canStartConversation ? (
          composerOpen ? (
            <form className="mt-5 border-t border-slate-200/80 pt-5 dark:border-slate-800" onSubmit={submit}>
              <div className="flex items-start justify-between gap-3">
                <label className="text-sm font-semibold text-slate-900 dark:text-white" htmlFor={"theme-prompt-" + theme.id}>
                  {messages.prompt}
                </label>
                <button aria-label={messages.closeComposer} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900" disabled={pending} onClick={() => setComposerOpen(false)} type="button">
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {messages.suggestions.map((suggestion) => (
                  <button className="min-h-10 cursor-pointer rounded-full border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-violet-700 dark:hover:text-violet-300" disabled={pending} key={suggestion} onClick={() => setDraft(suggestion)} type="button">
                    {suggestion}
                  </button>
                ))}
              </div>
              <textarea
                className="mt-3 min-h-28 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                disabled={pending}
                id={"theme-prompt-" + theme.id}
                maxLength={4000}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(false);
                }}
                placeholder={messages.promptPlaceholder}
                value={draft}
              />
              <button className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={!draft.trim() || pending} type="submit">
                {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <MessageCircle aria-hidden="true" className="size-4" />}
                {pending ? messages.openingConversation : messages.startConversation}
              </button>
              {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{messages.conversationError}</p> : null}
            </form>
          ) : (
            <button className="mt-5 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-200 dark:hover:bg-violet-950" onClick={() => setComposerOpen(true)} type="button">
              <MessageCircle aria-hidden="true" className="size-4" />
              {messages.explore}
            </button>
          )
        ) : null}
      </div>
    </article>
  );
}

export function ChartAtAGlance({
  canStartConversation,
  locale,
  messages,
  themes,
  uncertain,
}: {
  canStartConversation: boolean;
  locale: Locale;
  messages: ChartMessages;
  themes: ChartThemeView[];
  uncertain: boolean;
}) {
  const anchored = themes.slice(0, 3);
  const emergent = themes.slice(3);

  return (
    <div>
      {uncertain ? (
        <aside className="mb-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/35">
          <h2 className="font-semibold text-amber-950 dark:text-amber-100">{messages.unknownTimeTitle}</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-200/80">{messages.unknownTimeDescription}</p>
        </aside>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{messages.foundationsTitle}</h2>
        <div className="mt-3 space-y-4">
          {anchored.map((theme) => <ThemeCard canStartConversation={canStartConversation} key={theme.id} locale={locale} messages={messages} theme={theme} />)}
        </div>
      </section>

      <section className="mt-9">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{messages.emergentTitle}</h2>
        <div className="mt-3 space-y-4">
          {emergent.map((theme) => <ThemeCard canStartConversation={canStartConversation} key={theme.id} locale={locale} messages={messages} theme={theme} />)}
        </div>
      </section>
    </div>
  );
}
