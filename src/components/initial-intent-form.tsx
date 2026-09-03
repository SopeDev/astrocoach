"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { saveInitialIntent, type InitialIntentFormState } from "@/app/actions/initial-intent";
import { ChartCalculationScreen } from "@/components/chart-calculation-screen";
import type { Locale } from "@/i18n/config";
import {
  ASTROLOGY_FAMILIARITIES,
  ASTROLOGY_STYLES,
  type AstrologyFamiliarity,
  type AstrologyStyle,
} from "@/lib/astrology-preferences";
import { LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/life-areas";

type Messages = {
  areas: Record<LifeAreaKey, string>;
  contextLabel: string;
  contextPlaceholder: string;
  contextHint: string;
  continue: string;
  preparingTitle: string;
  preparingDescription: string;
  errors: { areas: string; context: string; astrology: string; service: string };
};

type AstrologyMessages = {
  onboardingTitle: string;
  onboardingDescription: string;
  familiarityQuestion: string;
  familiarity: Record<AstrologyFamiliarity, string>;
  styleQuestion: string;
  styles: Record<AstrologyStyle, { label: string; description: string }>;
};

const initialState: InitialIntentFormState = {};

export function InitialIntentForm({ locale, messages, astrologyMessages, defaults }: {
  locale: Locale;
  messages: Messages;
  astrologyMessages: AstrologyMessages;
  defaults: { lifeAreas: string[]; currentContext: string | null; astrologyFamiliarity: AstrologyFamiliarity; astrologyStyle: AstrologyStyle };
}) {
  const [state, action, pending] = useActionState(saveInitialIntent.bind(null, locale), initialState);

  return (
    <form action={action} className="space-y-7">
      {pending ? <ChartCalculationScreen description={messages.preparingDescription} title={messages.preparingTitle} /> : null}

      <fieldset aria-describedby={state.error === "areas" ? "areas-error" : undefined}>
        <legend className="sr-only">Life areas</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LIFE_AREA_KEYS.map((key) => (
            <label className="group relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 transition has-checked:border-violet-500 has-checked:bg-violet-50 has-checked:text-violet-950 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:has-checked:border-violet-400 dark:has-checked:bg-violet-950/60 dark:has-checked:text-violet-100" key={key}>
              <input className="peer sr-only" defaultChecked={defaults?.lifeAreas.includes(key)} name="lifeAreas" type="checkbox" value={key} />
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-transparent peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-checked:text-white dark:border-slate-600 dark:bg-slate-950 dark:peer-checked:border-violet-500 dark:peer-checked:bg-violet-500">
                <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
              </span>
              <span>{messages.areas[key]}</span>
            </label>
          ))}
        </div>
        {state.error === "areas" ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" id="areas-error" role="alert">{messages.errors.areas}</p> : null}
      </fieldset>

      <div>
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="currentContext">{messages.contextLabel}</label>
        <textarea
          aria-describedby={state.error === "context" ? "context-error" : "context-hint"}
          className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          defaultValue={defaults?.currentContext ?? ""}
          id="currentContext"
          maxLength={2000}
          name="currentContext"
          placeholder={messages.contextPlaceholder}
        />
        <p className={`mt-2 text-sm ${state.error === "context" ? "text-red-700 dark:text-red-300" : "text-slate-500 dark:text-slate-400"}`} id={state.error === "context" ? "context-error" : "context-hint"}>{state.error === "context" ? messages.errors.context : messages.contextHint}</p>
      </div>

      <section className="border-t border-slate-200 pt-7 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{astrologyMessages.onboardingTitle}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{astrologyMessages.onboardingDescription}</p>

        <fieldset className="mt-6" aria-describedby={state.error === "astrology" ? "astrology-error" : undefined}>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">{astrologyMessages.familiarityQuestion}</legend>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ASTROLOGY_FAMILIARITIES.map((value) => (
              <label className="flex min-h-12 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition has-checked:border-violet-500 has-checked:bg-violet-50 has-checked:text-violet-950 has-checked:ring-1 has-checked:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:has-checked:border-violet-400 dark:has-checked:bg-violet-950/60 dark:has-checked:text-violet-100 dark:has-checked:ring-violet-400" key={value}>
                <input className="sr-only" defaultChecked={defaults.astrologyFamiliarity === value} name="astrologyFamiliarity" type="radio" value={value} />
                {astrologyMessages.familiarity[value]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6" aria-describedby={state.error === "astrology" ? "astrology-error" : undefined}>
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">{astrologyMessages.styleQuestion}</legend>
          <div className="mt-3 space-y-2">
            {ASTROLOGY_STYLES.map((value) => (
              <label className="block cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 transition has-checked:border-violet-500 has-checked:bg-violet-50 has-checked:ring-1 has-checked:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:has-checked:border-violet-400 dark:has-checked:bg-violet-950/60 dark:has-checked:ring-violet-400" key={value}>
                <input className="sr-only" defaultChecked={defaults.astrologyStyle === value} name="astrologyStyle" type="radio" value={value} />
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{astrologyMessages.styles[value].label}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">{astrologyMessages.styles[value].description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {state.error === "astrology" ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" id="astrology-error" role="alert">{messages.errors.astrology}</p> : null}
      </section>

      {state.error === "service" ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200" role="alert">{messages.errors.service}</p> : null}
      <button className="min-h-12 w-full cursor-pointer rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-wait disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={pending} type="submit">{messages.continue}</button>
    </form>
  );
}
