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
        <DiscoveryFlow
          initialQuestions={initialQuestions.data}
          initiallyCompleted={Boolean(intent.discoveryCompletedAt && finalAnswers.success)}
          locale={locale}
          messages={messages.initialDiscovery}
          savedFinalAnswers={finalAnswers.success ? finalAnswers.data : undefined}
          savedFinalQuestions={finalQuestions.success ? finalQuestions.data : undefined}
          savedInitialAnswers={initialAnswers.success ? initialAnswers.data : undefined}
        />
      </section>
    </main>
  );
}
