import { MessageCircleQuestion } from "lucide-react";
import { redirect } from "next/navigation";
import { DiscoveryFlow } from "@/components/discovery-flow";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import {
  discoveryAnswersSchema,
  discoveryQuestionsSchema,
  finalDiscoveryAnswersSchema,
  finalDiscoveryQuestionsSchema,
} from "@/lib/initial-discovery";

export default async function DiscoveryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const messages = getDictionary(locale);
  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  const initialQuestions = discoveryQuestionsSchema.safeParse(intent?.discoveryQuestions);
  if (!intent || !initialQuestions.success) redirect(`/${locale}/onboarding/intent`);

  const initialAnswers = discoveryAnswersSchema.safeParse(intent.initialAnswers);
  const finalQuestions = finalDiscoveryQuestionsSchema.safeParse(intent.finalQuestions);
  const finalAnswers = finalDiscoveryAnswersSchema.safeParse(intent.finalAnswers);

  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-20 sm:px-8 sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8"><ThemeToggle label={messages.themeToggle} /></div>
      <section className="relative mx-auto w-full max-w-xl">
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border border-violet-200/70 bg-white/70 text-violet-700 shadow-sm backdrop-blur dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200"><MessageCircleQuestion aria-hidden="true" className="size-5" /></div>
          <p className="mb-3 text-sm font-medium tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">{messages.appName}</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">{messages.initialDiscovery.title}</h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty leading-7 text-slate-600 dark:text-slate-300">{messages.initialDiscovery.description}</p>
        </div>
        <div className="mt-8">
          <DiscoveryFlow
            initialQuestions={initialQuestions.data}
            initiallyCompleted={Boolean(intent.discoveryCompletedAt && finalAnswers.success)}
            locale={locale}
            messages={messages.initialDiscovery}
            savedFinalAnswers={finalAnswers.success ? finalAnswers.data : undefined}
            savedFinalQuestions={finalQuestions.success ? finalQuestions.data : undefined}
            savedInitialAnswers={initialAnswers.success ? initialAnswers.data : undefined}
          />
        </div>
      </section>
    </main>
  );
}
