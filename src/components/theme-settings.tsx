"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useTransition } from "react";
import { persistThemePreference } from "@/app/actions/preferences";

type ThemePreference = "system" | "light" | "dark";

export function ThemeSettings({ initialPreference, labels }: {
  initialPreference: ThemePreference;
  labels: {
    system: string;
    light: string;
    dark: string;
    saving: string;
    saved: string;
    saveError: string;
  };
}) {
  const { setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(initialPreference);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);
  const [isPending, startTransition] = useTransition();
  const options = [
    { value: "system" as const, label: labels.system, icon: Monitor },
    { value: "light" as const, label: labels.light, icon: Sun },
    { value: "dark" as const, label: labels.dark, icon: Moon },
  ];

  function select(value: ThemePreference) {
    const previousTheme = selectedTheme;
    setSelectedTheme(value);
    setStatus(null);
    setTheme(value);

    startTransition(async () => {
      const result = await persistThemePreference(value);
      if (result.ok) {
        setStatus("saved");
        return;
      }

      setSelectedTheme(previousTheme);
      setTheme(previousTheme);
      setStatus("error");
    });
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {options.map(({ value, label, icon: Icon }) => {
          const selected = selectedTheme === value;
          return <button aria-pressed={selected} className={`${selected ? "border-violet-500 bg-violet-50 text-violet-800 ring-1 ring-violet-500 dark:border-violet-400 dark:bg-violet-950/60 dark:text-violet-100 dark:ring-violet-400" : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"} flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-sm font-medium transition`} key={value} onClick={() => select(value)} type="button"><Icon aria-hidden="true" className="size-5" />{label}</button>;
        })}
      </div>
      <p aria-live="polite" className={`${status === "error" ? "text-red-600 dark:text-red-300" : "text-slate-500 dark:text-slate-400"} mt-3 min-h-5 text-sm`}>
        {isPending ? labels.saving : status === "saved" ? labels.saved : status === "error" ? labels.saveError : ""}
      </p>
    </div>
  );
}
