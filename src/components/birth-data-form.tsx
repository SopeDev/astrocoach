"use client";

import { useActionState, useState } from "react";
import { CalendarDays, Clock3, Info } from "lucide-react";
import { saveBirthData, type BirthDataFormState } from "@/app/actions/birth-data";
import type { Locale } from "@/i18n/config";

type BirthDataMessages = {
  dateLabel: string;
  dateHint: string;
  timeUnknownLabel: string;
  timeLabel: string;
  unknownTimeExplanation: string;
  continue: string;
  errors: { invalidDate: string; futureDate: string; requiredTime: string; invalidTime: string };
};

const initialState: BirthDataFormState = {};

export function BirthDataForm({ locale, messages, defaultDate, defaultTime, defaultTimeUnknown }: {
  locale: Locale;
  messages: BirthDataMessages;
  defaultDate?: string;
  defaultTime?: string;
  defaultTimeUnknown: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveBirthData.bind(null, locale), initialState);
  const [timeUnknown, setTimeUnknown] = useState(defaultTimeUnknown);
  const dateError = state.errors?.birthDate === "future" ? messages.errors.futureDate : state.errors?.birthDate ? messages.errors.invalidDate : undefined;
  const timeError = state.errors?.birthTime === "invalid" ? messages.errors.invalidTime : state.errors?.birthTime ? messages.errors.requiredTime : undefined;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="birthDate">
          <CalendarDays aria-hidden="true" className="size-4 text-violet-600 dark:text-violet-300" />
          {messages.dateLabel}
        </label>
        <input aria-describedby={dateError ? "birth-date-error" : "birth-date-hint"} aria-invalid={Boolean(dateError)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" defaultValue={defaultDate} id="birthDate" name="birthDate" required type="date" />
        {dateError ? <p className="mt-2 text-sm text-red-700 dark:text-red-300" id="birth-date-error" role="alert">{dateError}</p> : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400" id="birth-date-hint">{messages.dateHint}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        {!timeUnknown ? (
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="birthTime">
              <Clock3 aria-hidden="true" className="size-4 text-violet-600 dark:text-violet-300" />
              {messages.timeLabel}
            </label>
            <input aria-describedby={timeError ? "birth-time-error" : undefined} aria-invalid={Boolean(timeError)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" defaultValue={defaultTime} id="birthTime" name="birthTime" required type="time" />
            {timeError ? <p className="mt-2 text-sm text-red-700 dark:text-red-300" id="birth-time-error" role="alert">{timeError}</p> : null}
          </div>
        ) : null}

        <label className={`${timeUnknown ? "" : "mt-4 border-t border-slate-200 pt-4 dark:border-slate-800"} flex min-h-11 cursor-pointer items-center gap-3`} htmlFor="birthTimeUnknown">
          <input checked={timeUnknown} className="size-5 shrink-0 cursor-pointer accent-violet-600" id="birthTimeUnknown" name="birthTimeUnknown" onChange={(event) => setTimeUnknown(event.target.checked)} type="checkbox" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{messages.timeUnknownLabel}</span>
        </label>

        {timeUnknown ? (
          <div className="mt-3 flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <Info aria-hidden="true" className="mt-1 size-4 shrink-0 text-violet-600 dark:text-violet-300" />
            <p>{messages.unknownTimeExplanation}</p>
          </div>
        ) : null}
      </div>

      <button className="min-h-12 w-full cursor-pointer rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-wait disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={pending} type="submit">{messages.continue}</button>
    </form>
  );
}
