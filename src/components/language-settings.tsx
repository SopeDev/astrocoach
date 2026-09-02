import { Check, Languages } from "lucide-react";
import { changeLanguagePreference } from "@/app/actions/preferences";
import type { Locale } from "@/i18n/config";

const options = [
  { value: "en" as const, label: "English" },
  { value: "es" as const, label: "Español" },
];

export function LanguageSettings({ currentLocale, selectedLabel }: { currentLocale: Locale; selectedLabel: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const selected = option.value === currentLocale;
        return (
          <form action={changeLanguagePreference} key={option.value}>
            <input name="locale" type="hidden" value={option.value} />
            <button aria-label={selected ? `${option.label}, ${selectedLabel}` : option.label} aria-pressed={selected} className={`${selected ? "border-violet-500 bg-violet-50 text-violet-800 ring-1 ring-violet-500 dark:border-violet-400 dark:bg-violet-950/60 dark:text-violet-100 dark:ring-violet-400" : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"} relative flex min-h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border px-3 py-3 font-medium transition`} type="submit">
              <Languages aria-hidden="true" className="size-5" />
              {option.label}
              {selected ? <Check aria-hidden="true" className="absolute right-3 size-4" /> : null}
            </button>
          </form>
        );
      })}
    </div>
  );
}
