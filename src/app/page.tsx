import { Languages, MoonStar } from "lucide-react";
import { redirect } from "next/navigation";
import { selectLanguage } from "@/app/actions/onboarding";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth-user";
import { getUserLandingPath } from "@/lib/user-landing";

const languageOptions = [
  { locale: "en", name: "English", description: "Continue in English" },
  { locale: "es", name: "Español", description: "Continuar en español" },
] as const;

export default async function LanguageSelectionPage() {
  const user = await getCurrentUser();
  if (user) redirect(await getUserLandingPath(user.locale, user.id));

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-14 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
        <ThemeToggle label="Toggle color theme / Cambiar tema de color" />
      </div>

      <section className="relative w-full max-w-xl">
        <div className="text-center">
          <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl border border-violet-200/70 bg-white/70 text-violet-700 shadow-sm backdrop-blur dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200">
            <MoonStar aria-hidden="true" className="size-5" />
          </div>
          <p className="mb-3 text-sm font-medium tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">AstroCoach</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white">Choose your language</h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">Elige tu idioma</p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {languageOptions.map((language) => (
            <form action={selectLanguage} key={language.locale}>
              <input name="locale" type="hidden" value={language.locale} />
              <button
                className="group flex min-h-32 w-full cursor-pointer items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/75 p-5 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-800 dark:bg-slate-950/55 dark:hover:border-violet-700 dark:hover:bg-slate-950"
                type="submit"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:group-hover:bg-violet-900">
                  <Languages aria-hidden="true" className="size-5" />
                </span>
                <span>
                  <span className="block text-lg font-semibold text-slate-950 dark:text-white">{language.name}</span>
                  <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{language.description}</span>
                </span>
              </button>
            </form>
          ))}
        </div>

        <p className="mx-auto mt-7 max-w-md text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
          You can change this later. · Podrás cambiarlo más adelante.
        </p>
      </section>
    </main>
  );
}
