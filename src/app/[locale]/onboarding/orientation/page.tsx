import { Compass, Map, MessageCircle, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { completeOrientation } from "@/app/actions/orientation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function OrientationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;

  const messages = getDictionary(locale);
  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  if (!intent?.discoveryCompletedAt) redirect(`/${locale}/onboarding/discovery`);
  if (intent.orientationCompletedAt) redirect(`/${locale}/home`);

  const steps = [
    { icon: MessageCircle, ...messages.orientation.share },
    { icon: Compass, ...messages.orientation.explore },
    { icon: Map, ...messages.orientation.keep },
  ];

  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-14 sm:px-8 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />
      <section className="relative mx-auto w-full max-w-lg">
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><Sparkles aria-hidden="true" className="size-5" /></div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">{messages.orientation.title}</h1>
          <p className="mx-auto mt-4 max-w-md text-pretty leading-7 text-slate-600 dark:text-slate-300">{messages.orientation.description}</p>
        </div>

        <div className="mt-9 space-y-3">
          {steps.map(({ icon: Icon, title, description }) => (
            <div className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60" key={title}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><Icon aria-hidden="true" className="size-5" /></span>
              <div><h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p></div>
            </div>
          ))}
        </div>

        <form action={completeOrientation.bind(null, locale)} className="mt-7">
          <button className="min-h-12 w-full cursor-pointer rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500" type="submit">{messages.orientation.continue}</button>
        </form>
      </section>
    </main>
  );
}
