import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { HomeComposer } from "@/components/home-composer";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const messages = getDictionary(locale);
  const latest = await db.conversation.findFirst({ where: { userId: user.id, archivedAt: null }, orderBy: { lastMessageAt: "desc" } });
  const firstName = user.name?.trim().split(/\s+/)[0];

  return (
    <main>
      <p className="text-sm text-slate-500 dark:text-slate-400">{firstName ? messages.home.greeting.replace("{name}", firstName) : messages.home.greetingFallback}</p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.home.title}</h1>
      <p className="mt-3 max-w-lg leading-7 text-slate-600 dark:text-slate-300">{messages.home.description}</p>
      <div className="mt-7"><HomeComposer locale={locale} messages={messages.home.composer} voiceMessages={messages.explore} /></div>

      {latest ? (
        <section className="mt-10">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-950 dark:text-white">{messages.home.recentTitle}</h2><Link className="text-sm font-medium text-violet-700 dark:text-violet-300" href={`/${locale}/conversations`}>{messages.home.viewAll}</Link></div>
          <Link className="mt-3 flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-950/55 dark:hover:border-violet-700" href={`/${locale}/explore/${latest.id}`}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><MessagesSquare aria-hidden="true" className="size-5" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-900 dark:text-white">{latest.title ?? messages.home.untitled}</span><span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{latest.status === "closed" ? messages.home.review : messages.home.continue}</span></span>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          </Link>
        </section>
      ) : null}
    </main>
  );
}
