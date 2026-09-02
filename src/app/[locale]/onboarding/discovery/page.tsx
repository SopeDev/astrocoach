import Link from "next/link";
import { ArrowLeft, MessageCircleQuestion, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

const questionsSchema = z.array(z.string().min(1)).min(1);

export default async function DiscoveryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const messages = getDictionary(locale);
  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  const questions = questionsSchema.safeParse(intent?.discoveryQuestions);
  if (!intent || !questions.success) redirect(`/${locale}/onboarding/intent`);

  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-20 sm:px-8 sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />
      <div className="absolute left-5 top-5 sm:left-8 sm:top-8"><Link aria-label={messages.initialDiscovery.back} className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900" href={`/${locale}/onboarding/intent`}><ArrowLeft aria-hidden="true" className="size-4" /></Link></div>
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8"><ThemeToggle label={messages.themeToggle} /></div>
      <section className="relative mx-auto w-full max-w-xl">
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border border-violet-200/70 bg-white/70 text-violet-700 shadow-sm backdrop-blur dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200"><MessageCircleQuestion aria-hidden="true" className="size-5" /></div>
          <p className="mb-3 text-sm font-medium tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">{messages.appName}</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">{messages.initialDiscovery.title}</h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty leading-7 text-slate-600 dark:text-slate-300">{messages.initialDiscovery.description}</p>
        </div>
        <ol className="mt-8 space-y-4">
          {questions.data.map((question, index) => (
            <li className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60" key={question}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-200">{index + 1}</span>
              <p className="pt-1 leading-7 text-slate-800 dark:text-slate-100">{question}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-violet-50 p-4 text-sm leading-6 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100"><Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{messages.initialDiscovery.note}</div>
      </section>
    </main>
  );
}
