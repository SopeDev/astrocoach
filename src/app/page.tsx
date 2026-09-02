import { MoonStar } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />

      <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <section className="relative w-full max-w-2xl text-center">
        <div className="mx-auto mb-7 flex size-12 items-center justify-center rounded-2xl border border-violet-200/70 bg-white/70 text-violet-700 shadow-sm backdrop-blur dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200">
          <MoonStar aria-hidden="true" className="size-5" />
        </div>
        <p className="mb-3 text-sm font-medium tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">
          AstroCoach
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl dark:text-white">
          A little more clarity about what is happening.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-600 dark:text-slate-300">
          A calm, reflective space for exploring your lived experience. Astrology stays in the background and helps us ask better questions.
        </p>
        <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-violet-200/60 bg-white/65 p-4 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-violet-800/50 dark:bg-slate-950/45 dark:text-slate-300">
          Foundation ready. Language-first onboarding is the next slice.
        </div>
      </section>
    </main>
  );
}
