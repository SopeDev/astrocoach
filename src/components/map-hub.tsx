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

export function MapHub({ locale, messages, patternCount }: {
  locale: Locale;
  messages: MapHubMessages;
  patternCount: number;
}) {
  const countLabel = messages.patternCount.replace("{count}", String(patternCount));
  const patternsLabel = patternCount ? `${messages.hubPatternsTitle}, ${countLabel}` : messages.hubPatternsTitle;

  return (
    <nav aria-label={messages.navigationLabel} className="mx-auto mt-8 w-full max-w-[30rem]">
      <svg className="aspect-square w-full overflow-visible" viewBox="0 0 400 400">
        <circle aria-hidden="true" cx="200" cy="200" fill="var(--surface-muted)" r="190" />
        <circle aria-hidden="true" className="map-orbit" cx="200" cy="200" fill="none" r="183" strokeWidth="1" />
        <circle aria-hidden="true" className="map-orbit" cx="200" cy="200" fill="none" r="88" strokeWidth="1" />

        <g aria-hidden="true" className="stroke-[var(--line-strong)]" strokeWidth="1">
          <path d="M200 10v10M295 35l-5 9M365 105l-9 5M390 200h-10M365 295l-9-5M295 365l-5-9M200 390v-10M105 365l5-9M35 295l9-5M10 200h10M35 105l9 5M105 35l5 9" />
        </g>

        <a aria-label={patternsLabel} className="group outline-none" href={`/${locale}/map/patterns`}>
          <path className="fill-[var(--recognition-soft)] stroke-[var(--line)] transition-colors group-hover:fill-amber-200/45 group-focus-visible:fill-amber-200/55 dark:group-hover:fill-amber-700/20 dark:group-focus-visible:fill-amber-700/25" d="M45.8 111A178 178 0 0 1 354.2 111L271 159A82 82 0 0 0 129 159Z" />
          <circle aria-hidden="true" className="fill-[var(--recognition)]" cx="200" cy="54" r="4" />
          <foreignObject height="76" pointerEvents="none" width="170" x="115" y="68">
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-950 dark:text-white">
              <span className="text-sm font-semibold sm:text-base">{messages.hubPatternsTitle}</span>
              {patternCount ? <span className="mt-1 text-[11px] text-[var(--recognition)] sm:text-xs">{countLabel}</span> : null}
            </div>
          </foreignObject>
        </a>

        <a aria-label={messages.insightsTitle} className="group outline-none" href={`/${locale}/map/insights`}>
          <path className="fill-[var(--natal-soft)] stroke-[var(--line)] transition-colors group-hover:fill-blue-200/45 group-focus-visible:fill-blue-200/55 dark:group-hover:fill-blue-700/20 dark:group-focus-visible:fill-blue-700/25" d="M361.3 124.8A178 178 0 0 1 184.5 377.3L192.9 281.7A82 82 0 0 0 274.3 165.3Z" />
          <circle aria-hidden="true" className="fill-[var(--natal)]" cx="350" cy="200" r="3.5" />
          <foreignObject height="72" pointerEvents="none" width="112" x="260" y="225">
            <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-slate-950 sm:text-base dark:text-white">{messages.insightsTitle}</div>
          </foreignObject>
        </a>

        <a aria-label={messages.practicesTitle} className="group outline-none" href={`/${locale}/map/practices`}>
          <path className="fill-[var(--explore-soft)] stroke-[var(--line)] transition-colors group-hover:fill-violet-200/45 group-focus-visible:fill-violet-200/55 dark:group-hover:fill-violet-700/20 dark:group-focus-visible:fill-violet-700/25" d="M169.1 375.3A178 178 0 0 1 63.6 85.6L137.2 147.3A82 82 0 0 0 185.8 280.8Z" />
          <circle aria-hidden="true" className="fill-[var(--explore)]" cx="50" cy="200" r="3.5" />
          <foreignObject height="72" pointerEvents="none" width="116" x="28" y="225">
            <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-slate-950 sm:text-base dark:text-white">{messages.practicesTitle}</div>
          </foreignObject>
        </a>

        <a aria-label={`${messages.chartTitle}. ${messages.chartDescription}`} className="group outline-none" href={`/${locale}/chart`}>
          <circle className="fill-[var(--surface-strong)] stroke-blue-300/60 transition-colors group-hover:fill-blue-50 group-focus-visible:fill-blue-50 dark:stroke-blue-700/50 dark:group-hover:fill-blue-950/40 dark:group-focus-visible:fill-blue-950/40" cx="200" cy="200" r="72" strokeWidth="1.5" />
          <circle aria-hidden="true" className="fill-none stroke-[var(--natal)] opacity-45" cx="200" cy="200" r="58" strokeDasharray="2 7" />
          <circle aria-hidden="true" className="fill-[var(--natal)]" cx="200" cy="147" r="4" />
          <foreignObject height="94" pointerEvents="none" width="124" x="138" y="164">
            <div className="flex h-full flex-col items-center justify-center px-1 text-center text-slate-950 dark:text-white">
              <span className="text-sm font-semibold sm:text-base">{messages.chartTitle}</span>
              <span className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-[11px] dark:text-slate-400">{messages.chartDescription}</span>
            </div>
          </foreignObject>
        </a>
      </svg>
    </nav>
  );
}
