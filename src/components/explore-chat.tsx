"use client";

import { FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, Check, LoaderCircle, RefreshCw, Send, Sparkles } from "lucide-react";
import {
  acceptRecognitionTransition,
  declineRecognitionTransition,
  retryExploreResponse,
  saveRecognizedPattern,
  sendExploreMessage,
  type ConversationMessage,
  type ConversationMode,
  type PatternSaveOffer,
} from "@/app/actions/explore";
import type { Locale } from "@/i18n/config";

type Messages = {
  title: string;
  closerTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  inputLabel: string;
  inputPlaceholder: string;
  send: string;
  thinking: string;
  retry: string;
  generationError: string;
  messageError: string;
  backHome: string;
  account: string;
  transitionTitle: string;
  transitionDescription: string;
  transitionAccept: string;
  transitionDecline: string;
  patternTitle: string;
  patternDescription: string;
  savePattern: string;
  savingPattern: string;
  patternSaved: string;
  viewMap: string;
  returnHome: string;
  actionError: string;
};

export function ExploreChat({ locale, initialConversationId, initialMessages, initialFailedMessageId, initialMode, initialTransitionOffered, initialPatternSaveOffer, initialClosed, messages, profileInitial }: {
  locale: Locale;
  initialConversationId: string;
  initialMessages: ConversationMessage[];
  initialFailedMessageId: string | null;
  initialMode: ConversationMode;
  initialTransitionOffered: boolean;
  initialPatternSaveOffer: PatternSaveOffer | null;
  initialClosed: boolean;
  messages: Messages;
  profileInitial: string;
}) {
  const [thread, setThread] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [failedMessageId, setFailedMessageId] = useState(initialFailedMessageId);
  const [error, setError] = useState<"message" | "generation" | "action" | null>(initialFailedMessageId ? "generation" : null);
  const [mode, setMode] = useState<ConversationMode>(initialMode);
  const [transitionOffered, setTransitionOffered] = useState(initialTransitionOffered);
  const [patternSaveOffer, setPatternSaveOffer] = useState(initialPatternSaveOffer);
  const [closed, setClosed] = useState(initialClosed);
  const [patternSaved, setPatternSaved] = useState(initialClosed && Boolean(initialPatternSaveOffer));
  const [savingPattern, setSavingPattern] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasScrolledOnLoad = useRef(false);
  const composerInput = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = composerInput.current;
    if (!textarea) return;

    function resizeComposer() {
      if (!textarea) return;
      textarea.style.height = "auto";
      const maximumHeight = Math.max(48, Math.floor(window.innerHeight / 3));
      const nextHeight = Math.min(textarea.scrollHeight, maximumHeight);
      textarea.style.height = `${Math.max(48, nextHeight)}px`;
      textarea.style.overflowY = textarea.scrollHeight > maximumHeight ? "auto" : "hidden";
    }

    resizeComposer();
    window.addEventListener("resize", resizeComposer);
    return () => window.removeEventListener("resize", resizeComposer);
  }, [draft]);

  useEffect(() => {
    const behavior: ScrollBehavior = hasScrolledOnLoad.current ? "smooth" : "auto";
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
      });
    });
    hasScrolledOnLoad.current = true;

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [closed, patternSaveOffer, patternSaved, pending, thread, transitionOffered]);

  function applyResult(result: Extract<Awaited<ReturnType<typeof sendExploreMessage>>, { ok: true }>, optimisticId?: string) {
    setThread((existing) => {
      const withoutOptimistic = optimisticId ? existing.filter((message) => message.id !== optimisticId) : existing;
      const withUser = result.userMessage && !withoutOptimistic.some((message) => message.id === result.userMessage?.id) ? [...withoutOptimistic, result.userMessage] : withoutOptimistic;
      return withUser.some((message) => message.id === result.assistantMessage.id) ? withUser : [...withUser, result.assistantMessage];
    });
    setMode(result.mode);
    setTransitionOffered(result.transitionOffered);
    setPatternSaveOffer(result.patternSaveOffer);
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || pending || failedMessageId || closed) {
      if (!content) setError("message");
      return;
    }

    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: ConversationMessage = { id: optimisticId, role: "user", mode, content, createdAt: new Date().toISOString() };
    setThread((existing) => [...existing, optimisticMessage]);
    setDraft("");
    setError(null);

    startTransition(async () => {
      const result = await sendExploreMessage(locale, initialConversationId, content);
      if (result.ok) {
        applyResult(result, optimisticId);
        return;
      }
      if (result.error === "generation" && result.userMessage) {
        setThread((existing) => [...existing.filter((message) => message.id !== optimisticId), result.userMessage!]);
        setFailedMessageId(result.userMessage.id);
        setError("generation");
      } else {
        setThread((existing) => existing.filter((message) => message.id !== optimisticId));
        setDraft(content);
        setError("message");
      }
    });
  }

  function retry() {
    if (!failedMessageId || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await retryExploreResponse(locale, initialConversationId, failedMessageId);
      if (result.ok) {
        applyResult(result);
        setFailedMessageId(null);
      } else {
        setError(result.error);
      }
    });
  }

  function acceptTransition() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await acceptRecognitionTransition(locale, initialConversationId);
        if (result.ok) {
          setThread((existing) => [...existing, result.assistantMessage]);
          setMode(result.mode);
          setTransitionOffered(false);
          return;
        }
        setError("action");
      } catch {
        setError("action");
      }
    });
  }

  function declineTransition() {
    if (pending) return;
    setTransitionOffered(false);
    startTransition(async () => {
      try {
        const result = await declineRecognitionTransition(locale, initialConversationId);
        if (result.ok) return;
        setTransitionOffered(true);
        setError("action");
      } catch {
        setTransitionOffered(true);
        setError("action");
      }
    });
  }

  function savePattern() {
    if (!patternSaveOffer || pending) return;
    setError(null);
    setSavingPattern(true);
    startTransition(async () => {
      try {
        const result = await saveRecognizedPattern(locale, initialConversationId, patternSaveOffer.messageId);
        if (result.ok) {
          setPatternSaved(true);
          setClosed(true);
        } else {
          setError("action");
        }
      } catch {
        setError("action");
      } finally {
        setSavingPattern(false);
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <main className="flex min-h-svh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[color:var(--background)]/90 px-5 py-4 backdrop-blur dark:border-slate-800/80">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Link aria-label={messages.backHome} className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-white dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900" href={`/${locale}/home`}><ArrowLeft aria-hidden="true" className="size-4" /></Link><div><h1 className="text-lg font-semibold tracking-tight">{messages.title}</h1>{mode === "RECOGNIZE" ? <p className="text-xs font-medium text-violet-600 dark:text-violet-300">{messages.closerTitle}</p> : null}</div></div>
          <Link aria-label={messages.account} className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-violet-700 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500" href={`/${locale}/account`}>{profileInitial}</Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5">
        <div className="flex-1 py-6">
          {thread.length === 0 ? <div className="flex min-h-[45svh] flex-col justify-center text-center"><h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.emptyTitle}</h2><p className="mx-auto mt-3 max-w-sm text-pretty leading-7 text-slate-600 dark:text-slate-300">{messages.emptyDescription}</p></div> : (
            <div className="space-y-5" aria-live="polite">
              {thread.map((message) => <article className={message.role === "user" ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-violet-700 px-4 py-3 text-white dark:bg-violet-600" : "mr-auto max-w-[92%] text-slate-800 dark:text-slate-100"} key={message.id} translate="no"><p className="whitespace-pre-wrap text-[0.98rem] leading-7">{message.content}</p></article>)}
              {pending && !savingPattern ? <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />{messages.thinking}</div> : null}
              {failedMessageId && !pending ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"><p>{messages.generationError}</p><button className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-amber-300 px-4 py-2 font-semibold transition hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-950" onClick={retry} type="button"><RefreshCw aria-hidden="true" className="size-4" />{messages.retry}</button></div> : null}
              {transitionOffered && !failedMessageId ? <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/45"><Sparkles aria-hidden="true" className="size-5 text-violet-700 dark:text-violet-300" /><h2 className="mt-3 font-semibold text-slate-950 dark:text-white">{messages.transitionTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.transitionDescription}</p><div className="mt-4 grid gap-2"><button className="min-h-12 cursor-pointer rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white transition hover:bg-violet-800 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={pending} onClick={acceptTransition} type="button">{messages.transitionAccept}</button><button className="min-h-11 cursor-pointer rounded-xl px-4 py-2 font-semibold text-slate-600 transition hover:bg-white/70 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-900/60" disabled={pending} onClick={declineTransition} type="button">{messages.transitionDecline}</button></div></section> : null}
              {patternSaveOffer ? <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">{patternSaved ? <Check aria-hidden="true" className="size-5 text-emerald-700 dark:text-emerald-300" /> : <Bookmark aria-hidden="true" className="size-5 text-emerald-700 dark:text-emerald-300" />}<h2 className="mt-3 font-semibold text-slate-950 dark:text-white">{patternSaved ? messages.patternSaved : messages.patternTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{patternSaveOffer.statement}</p>{patternSaved ? <div className="mt-4 grid grid-cols-2 gap-2"><Link className="flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white" href={`/${locale}/map`}>{messages.viewMap}</Link><Link className="flex min-h-11 items-center justify-center rounded-xl border border-emerald-300 px-3 py-2 text-center text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:text-emerald-100" href={`/${locale}/home`}>{messages.returnHome}</Link></div> : <><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.patternDescription}</p><button className="mt-4 min-h-12 w-full cursor-pointer rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60" disabled={pending} onClick={savePattern} type="button">{savingPattern ? messages.savingPattern : messages.savePattern}</button></>}</section> : null}
              {error === "action" ? <p className="text-sm text-red-700 dark:text-red-300" role="alert">{messages.actionError}</p> : null}
            </div>
          )}
        </div>

        {!closed ? <form className="sticky bottom-0 border-t border-slate-200/70 bg-[color:var(--background)]/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur dark:border-slate-800/80" onSubmit={submit}><label className="sr-only" htmlFor="explore-message">{messages.inputLabel}</label><div className="flex items-end gap-3"><textarea className="min-h-12 flex-1 resize-none overflow-y-hidden rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white" disabled={pending || Boolean(failedMessageId)} id="explore-message" maxLength={4000} onChange={(event) => { setDraft(event.target.value); if (event.target.value.trim()) setError(null); }} onKeyDown={handleKeyDown} placeholder={messages.inputPlaceholder} ref={composerInput} rows={1} value={draft} /><button aria-label={messages.send} className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-violet-700 text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={pending || Boolean(failedMessageId) || !draft.trim()} type="submit"><Send aria-hidden="true" className="size-5" /></button></div>{error === "message" ? <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{messages.messageError}</p> : null}</form> : null}
      </div>
    </main>
  );
}
