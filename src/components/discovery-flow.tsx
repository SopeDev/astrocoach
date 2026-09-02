"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Sparkles } from "lucide-react";
import { completeInitialDiscovery, prepareFinalDiscoveryQuestions } from "@/app/actions/initial-discovery";
import type { Locale } from "@/i18n/config";

type Messages = {
  step: string;
  initialStage: string;
  finalStage: string;
  answerLabel: string;
  answerPlaceholder: string;
  back: string;
  next: string;
  prepareFinal: string;
  preparingFinal: string;
  complete: string;
  saving: string;
  answerRequired: string;
  serviceError: string;
  completedTitle: string;
  completedDescription: string;
};

export function DiscoveryFlow({
  locale,
  initialQuestions,
  savedInitialAnswers,
  savedFinalQuestions,
  savedFinalAnswers,
  initiallyCompleted,
  messages,
}: {
  locale: Locale;
  initialQuestions: string[];
  savedInitialAnswers?: string[];
  savedFinalQuestions?: string[];
  savedFinalAnswers?: string[];
  initiallyCompleted: boolean;
  messages: Messages;
}) {
  const [finalQuestions, setFinalQuestions] = useState(savedFinalQuestions);
  const [answers, setAnswers] = useState<string[]>([
    ...(savedInitialAnswers ?? ["", "", ""]),
    ...(savedFinalAnswers ?? ["", ""]),
  ]);
  const [current, setCurrent] = useState(savedFinalQuestions ? 3 : 0);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [error, setError] = useState<"required" | "service" | null>(null);
  const [pending, startTransition] = useTransition();
  const stageLocked = Boolean(finalQuestions);
  const questions = [...initialQuestions, ...(finalQuestions ?? [])];

  if (completed) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 text-center shadow-sm backdrop-blur sm:p-8 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"><Check aria-hidden="true" className="size-6" /></div>
        <h2 className="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">{messages.completedTitle}</h2>
        <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600 dark:text-slate-300">{messages.completedDescription}</p>
      </div>
    );
  }

  const currentQuestion = questions[current];
  const stageLabel = current < 3 ? messages.initialStage : messages.finalStage;

  function updateAnswer(value: string) {
    setAnswers((existing) => existing.map((answer, index) => index === current ? value : answer));
    if (value.trim()) setError(null);
  }

  function goBack() {
    if (current > (stageLocked ? 3 : 0)) {
      setCurrent((index) => index - 1);
      setError(null);
    }
  }

  function goNext() {
    if (!answers[current]?.trim()) {
      setError("required");
      return;
    }

    setError(null);
    if (current < 2 || current === 3) {
      setCurrent((index) => index + 1);
      return;
    }

    if (current === 2) {
      startTransition(async () => {
        const result = await prepareFinalDiscoveryQuestions(locale, answers.slice(0, 3));
        if (result.questions) {
          setFinalQuestions(result.questions);
          setCurrent(3);
        } else {
          setError(result.error === "answers" ? "required" : "service");
        }
      });
      return;
    }

    startTransition(async () => {
      const result = await completeInitialDiscovery(locale, answers.slice(3, 5));
      if (result.completed) setCompleted(true);
      else setError(result.error === "answers" ? "required" : "service");
    });
  }

  return (
    <div>
      <div aria-label={`${messages.step} ${current + 1} / 5`} className="flex items-center" role="progressbar" aria-valuemax={5} aria-valuemin={1} aria-valuenow={current + 1}>
        {[0, 1, 2, 3, 4].map((index) => (
          <div className="flex flex-1 items-center last:flex-none" key={index}>
            <span className={`${index === current ? "scale-110 bg-violet-700 text-white ring-4 ring-violet-100 dark:bg-violet-500 dark:ring-violet-950" : index < current || (stageLocked && index < 3) ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"} flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition`}>
              {index < current || (stageLocked && index < 3) ? <Check aria-hidden="true" className="size-4" /> : index + 1}
            </span>
            {index < 4 ? <span className={`${index < current || (stageLocked && index < 3) ? "bg-violet-400" : "bg-slate-200 dark:bg-slate-700"} mx-1 h-0.5 flex-1 transition-colors`} /> : null}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-7 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-xs font-semibold tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">{stageLabel} · {messages.step} {current + 1} / 5</p>
        <h2 className="mt-4 text-balance text-2xl font-semibold leading-9 text-slate-950 dark:text-white">{currentQuestion}</h2>
        <label className="mt-7 block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="discoveryAnswer">{messages.answerLabel}</label>
        <textarea
          autoFocus
          className="mt-2 min-h-40 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          disabled={pending}
          id="discoveryAnswer"
          maxLength={2000}
          onChange={(event) => updateAnswer(event.target.value)}
          placeholder={messages.answerPlaceholder}
          value={answers[current] ?? ""}
        />
        {error ? <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{error === "required" ? messages.answerRequired : messages.serviceError}</p> : null}

        <div className="mt-6 flex items-center gap-3">
          {!stageLocked && current === 0 ? (
            <Link className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" href={`/${locale}/onboarding/intent`}><ArrowLeft aria-hidden="true" className="size-4" />{messages.back}</Link>
          ) : (
            <button className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" disabled={pending || current === 3} onClick={goBack} type="button"><ArrowLeft aria-hidden="true" className="size-4" />{messages.back}</button>
          )}
          <button className="flex min-h-12 flex-[1.4] cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={pending} onClick={goNext} type="button">
            {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : current === 2 ? <Sparkles aria-hidden="true" className="size-4" /> : current < 4 ? <ArrowRight aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4" />}
            {pending ? (current === 2 ? messages.preparingFinal : messages.saving) : current === 2 ? messages.prepareFinal : current === 4 ? messages.complete : messages.next}
          </button>
        </div>
      </div>
    </div>
  );
}
