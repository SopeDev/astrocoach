"use client";

import { useState, useTransition } from "react";
import { persistAstrologyPreferences } from "@/app/actions/preferences";
import {
  ASTROLOGY_FAMILIARITIES,
  ASTROLOGY_STYLES,
  type AstrologyFamiliarity,
  type AstrologyStyle,
} from "@/lib/astrology-preferences";

type Labels = {
  familiarityQuestion: string;
  familiarity: Record<AstrologyFamiliarity, string>;
  styleQuestion: string;
  styles: Record<AstrologyStyle, { label: string; description: string }>;
  saving: string;
  saved: string;
  saveError: string;
};

export function AstrologySettings({ initialFamiliarity, initialStyle, labels }: {
  initialFamiliarity: AstrologyFamiliarity;
  initialStyle: AstrologyStyle;
  labels: Labels;
}) {
  const [familiarity, setFamiliarity] = useState(initialFamiliarity);
  const [style, setStyle] = useState(initialStyle);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(nextFamiliarity: AstrologyFamiliarity, nextStyle: AstrologyStyle) {
    const previousFamiliarity = familiarity;
    const previousStyle = style;
    setFamiliarity(nextFamiliarity);
    setStyle(nextStyle);
    setStatus(null);

    startTransition(async () => {
      const result = await persistAstrologyPreferences(nextFamiliarity, nextStyle);
      if (result.ok) {
        setStatus("saved");
        return;
      }

      setFamiliarity(previousFamiliarity);
      setStyle(previousStyle);
      setStatus("error");
    });
  }

  return (
    <div>
      <fieldset disabled={isPending}>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">{labels.familiarityQuestion}</legend>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ASTROLOGY_FAMILIARITIES.map((value) => {
            const selected = familiarity === value;
            return <button aria-pressed={selected} className={`${selected ? "border-violet-500 bg-violet-50 text-violet-950 ring-1 ring-violet-500 dark:border-violet-400 dark:bg-violet-950/60 dark:text-violet-100 dark:ring-violet-400" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"} min-h-12 cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-medium transition disabled:cursor-wait disabled:opacity-60`} key={value} onClick={() => save(value, style)} type="button">{labels.familiarity[value]}</button>;
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6" disabled={isPending}>
        <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">{labels.styleQuestion}</legend>
        <div className="mt-3 space-y-2">
          {ASTROLOGY_STYLES.map((value) => {
            const selected = style === value;
            return <button aria-pressed={selected} className={`${selected ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500 dark:border-violet-400 dark:bg-violet-950/60 dark:ring-violet-400" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"} block w-full cursor-pointer rounded-2xl border px-4 py-3 text-left transition disabled:cursor-wait disabled:opacity-60`} key={value} onClick={() => save(familiarity, value)} type="button"><span className="block text-sm font-semibold text-slate-900 dark:text-white">{labels.styles[value].label}</span><span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">{labels.styles[value].description}</span></button>;
          })}
        </div>
      </fieldset>

      <p aria-live="polite" className={`${status === "error" ? "text-red-600 dark:text-red-300" : "text-slate-500 dark:text-slate-400"} mt-3 min-h-5 text-sm`}>
        {isPending ? labels.saving : status === "saved" ? labels.saved : status === "error" ? labels.saveError : ""}
      </p>
    </div>
  );
}
