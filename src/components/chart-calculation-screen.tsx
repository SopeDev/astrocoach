"use client";

import { MoonStar } from "lucide-react";
import { createPortal } from "react-dom";

const stars = [
  [8, 16, 0], [18, 72, 1.2], [27, 28, 2.1], [35, 84, 0.7], [46, 12, 1.7],
  [55, 66, 2.8], [64, 23, 0.4], [73, 78, 1.5], [82, 34, 2.4], [91, 61, 0.9],
  [13, 43, 2.7], [23, 91, 0.2], [40, 49, 1.1], [59, 92, 2], [70, 52, 0.6],
  [86, 9, 1.9], [95, 88, 2.5], [5, 94, 1.4],
] as const;

export function ChartCalculationScreen({ title, description }: { title: string; description: string }) {
  return createPortal(
    <div aria-live="polite" className="fixed inset-0 z-50 min-h-svh overflow-hidden bg-[#f7f5ff] text-slate-950 dark:bg-[#070916] dark:text-white" role="status">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(37,99,235,0.12),transparent_30%)] dark:bg-[radial-gradient(circle_at_50%_38%,rgba(124,58,237,0.25),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(37,99,235,0.18),transparent_28%)]" />

      <div aria-hidden="true" className="absolute inset-0">
        {stars.map(([left, top, delay], index) => (
          <span className={`chart-star ${index % 4 === 0 ? "size-1.5" : "size-1"}`} key={`${left}-${top}`} style={{ animationDelay: `${delay}s`, left: `${left}%`, top: `${top}%` }} />
        ))}

        <svg className="absolute inset-0 size-full opacity-45" fill="none" viewBox="0 0 390 844">
          <path className="chart-constellation-line" d="M38 150 104 205 78 291 166 333 211 259" />
          <path className="chart-constellation-line chart-constellation-line-delayed" d="m249 116 58 69-38 73 79 51" />
          <path className="chart-constellation-line chart-constellation-line-late" d="m42 603 71-48 63 75 74-53 96 73" />
          <g fill="currentColor" className="text-violet-700 dark:text-violet-200">
            <circle cx="38" cy="150" r="3" /><circle cx="104" cy="205" r="3" /><circle cx="78" cy="291" r="3" /><circle cx="166" cy="333" r="3" /><circle cx="211" cy="259" r="3" />
            <circle cx="249" cy="116" r="3" /><circle cx="307" cy="185" r="3" /><circle cx="269" cy="258" r="3" /><circle cx="348" cy="309" r="3" />
            <circle cx="42" cy="603" r="3" /><circle cx="113" cy="555" r="3" /><circle cx="176" cy="630" r="3" /><circle cx="250" cy="577" r="3" /><circle cx="346" cy="650" r="3" />
          </g>
        </svg>
      </div>

      <div className="relative flex min-h-svh items-center justify-center px-6 py-16 text-center">
        <div className="max-w-sm">
          <div className="chart-orbit mx-auto flex size-28 items-center justify-center rounded-full border border-violet-500/25 dark:border-violet-300/25">
            <div className="flex size-20 items-center justify-center rounded-full border border-violet-500/35 bg-violet-500/10 shadow-[0_0_60px_rgba(139,92,246,0.25)] dark:border-violet-300/35 dark:shadow-[0_0_60px_rgba(139,92,246,0.35)]">
              <MoonStar aria-hidden="true" className="size-8 text-violet-700 dark:text-violet-100" />
            </div>
          </div>
          <p className="mt-8 text-xs font-semibold tracking-[0.28em] text-violet-700 uppercase dark:text-violet-300">AstroCoach</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight">{title}</h2>
          <p className="mx-auto mt-4 max-w-xs text-pretty leading-7 text-slate-600 dark:text-slate-300">{description}</p>
          <div aria-hidden="true" className="mx-auto mt-8 flex w-24 gap-2">
            <span className="chart-progress-dot h-1 flex-1 rounded-full bg-violet-600 dark:bg-violet-400" />
            <span className="chart-progress-dot h-1 flex-1 rounded-full bg-violet-600 dark:bg-violet-400" />
            <span className="chart-progress-dot h-1 flex-1 rounded-full bg-violet-600 dark:bg-violet-400" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
