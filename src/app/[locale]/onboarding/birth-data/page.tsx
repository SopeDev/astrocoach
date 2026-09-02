import Link from "next/link";
import { ArrowLeft, MoonStar } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function BirthDataPlaceholderPage({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return null;
  }

  const messages = getDictionary(locale);

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-14 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />
      <div className="absolute left-5 top-5 sm:left-8 sm:top-8">
        <Link aria-label={messages.onboarding.changeLanguage} className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900" href="/">
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
        <ThemeToggle label={messages.themeToggle} />
      </div>

      <section className="relative w-full max-w-xl text-center">
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl border border-violet-200/70 bg-white/70 text-violet-700 shadow-sm backdrop-blur dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200">
          <MoonStar aria-hidden="true" className="size-5" />
        </div>
        <p className="mb-3 text-sm font-medium tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">{messages.appName}</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">{messages.onboarding.languageSavedTitle}</h1>
        <p className="mx-auto mt-5 max-w-md text-pretty text-lg leading-8 text-slate-600 dark:text-slate-300">{messages.onboarding.languageSavedDescription}</p>
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">{messages.onboarding.nextStep}</p>
      </section>
    </main>
  );
}
