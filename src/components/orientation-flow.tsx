"use client";

import { ArrowLeft, ArrowRight, Eye, Map, MessageCircle } from "lucide-react";
import { useState } from "react";
import { completeOrientation } from "@/app/actions/orientation";
import type { Locale } from "@/i18n/config";

type OrientationMessages = {
  screens: Array<{
    title: string;
    paragraphs: string[];
  }>;
  step: string;
  back: string;
  next: string;
  continue: string;
};

const icons = [MessageCircle, Eye, Map];

export function OrientationFlow({
  locale,
  messages,
}: {
  locale: Locale;
  messages: OrientationMessages;
}) {
  const [current, setCurrent] = useState(0);
  const screen = messages.screens[current];
  const Icon = icons[current] ?? MessageCircle;
  const isLast = current === messages.screens.length - 1;

  return (
    <section className="relative mx-auto flex min-h-[calc(100svh-7rem)] w-full max-w-lg flex-col">
      <div
        aria-label={`${messages.step} ${current + 1} / ${messages.screens.length}`}
        className="flex justify-center gap-2"
        role="progressbar"
        aria-valuemax={messages.screens.length}
        aria-valuemin={1}
        aria-valuenow={current + 1}
      >
        {messages.screens.map((item, index) => (
          <span
            aria-hidden="true"
            className={`h-1.5 rounded-full transition-all ${index === current ? "w-8 bg-violet-600" : "w-2 bg-slate-300 dark:bg-slate-700"}`}
            key={item.title}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center py-10 text-center">
        <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
          {screen.title}
        </h1>
        <div className="mx-auto mt-6 max-w-md space-y-4 text-pretty leading-7 text-slate-600 dark:text-slate-300">
          {screen.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </div>

      <div className="flex gap-3 pb-[max(0rem,env(safe-area-inset-bottom))]">
        {current > 0 ? (
          <button
            className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            onClick={() => setCurrent((value) => value - 1)}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {messages.back}
          </button>
        ) : null}

        {isLast ? (
          <form action={completeOrientation.bind(null, locale)} className="flex-1">
            <button className="min-h-12 w-full cursor-pointer rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500" type="submit">
              {messages.continue}
            </button>
          </form>
        ) : (
          <button
            className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500"
            onClick={() => setCurrent((value) => value + 1)}
            type="button"
          >
            {messages.next}
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </section>
  );
}
