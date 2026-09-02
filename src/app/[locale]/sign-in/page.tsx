import { ArrowLeft, LockKeyhole, MoonStar } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.53l3.35-2.61Z" fill="#FBBC05" />
      <path d="M12 5.95c1.47 0 2.79.5 3.82 1.5l2.88-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z" fill="#EA4335" />
    </svg>
  );
}

export default async function SignInPage({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return null;
  }

  if ((await auth())?.user) {
    redirect(`/${locale}/continue`);
  }

  const messages = getDictionary(locale);

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: `/${locale}/continue` });
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-20 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />
      <div className="absolute left-5 top-5 sm:left-8 sm:top-8">
        <Link aria-label={messages.auth.back} className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900" href="/">
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
        <ThemeToggle label={messages.themeToggle} />
      </div>

      <section className="relative w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl border border-violet-200/70 bg-white/70 text-violet-700 shadow-sm backdrop-blur dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200">
            <MoonStar aria-hidden="true" className="size-5" />
          </div>
          <p className="mb-3 text-sm font-medium tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">{messages.appName}</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">{messages.auth.title}</h1>
          <p className="mx-auto mt-4 max-w-sm text-pretty leading-7 text-slate-600 dark:text-slate-300">{messages.auth.description}</p>
        </div>

        <div className="mt-9 rounded-3xl border border-slate-200/80 bg-white/75 p-5 shadow-sm backdrop-blur sm:p-7 dark:border-slate-800 dark:bg-slate-950/55">
          <form action={signInWithGoogle}>
            <button className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-900 shadow-sm transition hover:border-violet-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-violet-700 dark:hover:bg-slate-800" type="submit">
              <GoogleMark />
              {messages.auth.google}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3" role="presentation">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">{messages.auth.or}</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <LockKeyhole aria-hidden="true" className="size-4 shrink-0" />
            {messages.auth.emailComingSoon}
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{messages.auth.privacy}</p>
      </section>
    </main>
  );
}
