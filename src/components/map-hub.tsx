import { ChartNoAxesCombined, Lightbulb, Repeat2, Sprout } from "lucide-react";
import type { Locale } from "@/i18n/config";

type MapHubMessages = {
  navigationLabel: string;
  chartTitle: string;
  chartDescription: string;
  hubPatternsTitle: string;
  patternCount: string;
  insightsTitle: string;
  practicesTitle: string;
};

export function MapHub({ insightsCount, locale, messages, patternCount, practicesCount }: {
  insightsCount: number;
  locale: Locale;
  messages: MapHubMessages;
  patternCount: number;
  practicesCount: number;
}) {
  const formatCount = (count: number) => messages.patternCount.replace("{count}", String(count));
  const patternCountLabel = formatCount(patternCount);
  const insightsCountLabel = formatCount(insightsCount);
  const practicesCountLabel = formatCount(practicesCount);

  return (
    <nav aria-label={messages.navigationLabel} className="mx-auto mt-8 w-full max-w-md">
      <svg className="aspect-square w-full" role="img" viewBox="0 0 400 400">
        <a aria-label={`${messages.hubPatternsTitle}, ${patternCountLabel}`} className="group outline-none" href={`/${locale}/map/patterns`}>
          <path className="fill-white/60 stroke-slate-300 transition-colors group-hover:fill-amber-50 group-focus-visible:fill-amber-50 dark:fill-slate-950/40 dark:stroke-slate-700 dark:group-hover:fill-amber-950/25 dark:group-focus-visible:fill-amber-950/25" d="M44.1 110A180 180 0 0 1 355.9 110L265.8 162A76 76 0 0 0 134.2 162Z" />
          <Repeat2 aria-hidden="true" className="pointer-events-none text-amber-600 dark:text-amber-400" height="20" width="20" x="190" y="43" />
          <text className="pointer-events-none fill-slate-950 text-[15px] font-semibold dark:fill-white" textAnchor="middle" x="200" y="82">{messages.hubPatternsTitle}</text>
          <text className="pointer-events-none fill-slate-500 text-[11px] dark:fill-slate-400" textAnchor="middle" x="200" y="102">{patternCountLabel}</text>
        </a>

        <a aria-label={`${messages.insightsTitle}, ${insightsCountLabel}`} className="group outline-none" href={`/${locale}/map/insights`}>
          <path className="fill-white/60 stroke-slate-300 transition-colors group-hover:fill-blue-50 group-focus-visible:fill-blue-50 dark:fill-slate-950/40 dark:stroke-slate-700 dark:group-hover:fill-blue-950/25 dark:group-focus-visible:fill-blue-950/25" d="M355.9 110A180 180 0 0 1 200 380L200 276A76 76 0 0 0 265.8 162Z" />
          <Lightbulb aria-hidden="true" className="pointer-events-none text-blue-600 dark:text-blue-300" height="20" width="20" x="305" y="224" />
          <text className="pointer-events-none fill-slate-950 text-[15px] font-semibold dark:fill-white" textAnchor="middle" x="315" y="263">{messages.insightsTitle}</text>
          <text className="pointer-events-none fill-slate-500 text-[11px] dark:fill-slate-400" textAnchor="middle" x="315" y="283">{insightsCountLabel}</text>
        </a>

        <a aria-label={`${messages.practicesTitle}, ${practicesCountLabel}`} className="group outline-none" href={`/${locale}/map/practices`}>
          <path className="fill-white/60 stroke-slate-300 transition-colors group-hover:fill-violet-50 group-focus-visible:fill-violet-50 dark:fill-slate-950/40 dark:stroke-slate-700 dark:group-hover:fill-violet-950/25 dark:group-focus-visible:fill-violet-950/25" d="M200 380A180 180 0 0 1 44.1 110L134.2 162A76 76 0 0 0 200 276Z" />
          <Sprout aria-hidden="true" className="pointer-events-none text-violet-600 dark:text-violet-300" height="20" width="20" x="75" y="224" />
          <text className="pointer-events-none fill-slate-950 text-[15px] font-semibold dark:fill-white" textAnchor="middle" x="85" y="263">{messages.practicesTitle}</text>
          <text className="pointer-events-none fill-slate-500 text-[11px] dark:fill-slate-400" textAnchor="middle" x="85" y="283">{practicesCountLabel}</text>
        </a>

        <a aria-label={`${messages.chartTitle}. ${messages.chartDescription}`} className="group outline-none" href={`/${locale}/chart`}>
          <circle className="fill-violet-50 stroke-violet-400 transition-colors group-hover:fill-violet-100 group-focus-visible:fill-violet-100 dark:fill-violet-950/40 dark:stroke-violet-700 dark:group-hover:fill-violet-950/65 dark:group-focus-visible:fill-violet-950/65" cx="200" cy="200" r="76" />
          <ChartNoAxesCombined aria-hidden="true" className="pointer-events-none text-violet-700 dark:text-violet-300" height="21" width="21" x="189.5" y="161" />
          <text className="pointer-events-none fill-slate-950 text-[15px] font-semibold dark:fill-white" textAnchor="middle" x="200" y="207">{messages.chartTitle}</text>
          <text className="pointer-events-none fill-slate-500 text-[10px] dark:fill-slate-400" textAnchor="middle" x="200" y="227">{messages.chartDescription}</text>
        </a>
      </svg>
    </nav>
  );
}
