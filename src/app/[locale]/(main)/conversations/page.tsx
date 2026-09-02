import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function ConversationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const messages = getDictionary(locale);
  const conversations = await db.conversation.findMany({ where: { userId: user.id }, orderBy: { lastMessageAt: "desc" }, include: { _count: { select: { messages: true } } } });

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.conversations.title}</h1>
      <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{messages.conversations.description}</p>
      {conversations.length ? <div className="mt-7 space-y-3">{conversations.map((conversation) => (
        <Link className="flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-950/55 dark:hover:border-violet-700" href={`/${locale}/explore/${conversation.id}`} key={conversation.id}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><MessageCircle aria-hidden="true" className="size-5" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-900 dark:text-white">{conversation.title ?? messages.conversations.untitled}</span><span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{messages.conversations.messageCount.replace("{count}", String(conversation._count.messages))}</span></span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
        </Link>
      ))}</div> : <div className="mt-10 rounded-3xl border border-dashed border-slate-300 p-7 text-center dark:border-slate-700"><MessageCircle aria-hidden="true" className="mx-auto size-7 text-violet-600 dark:text-violet-300" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{messages.conversations.emptyTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.conversations.emptyDescription}</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-2 font-semibold text-white dark:bg-violet-600" href={`/${locale}/home`}>{messages.conversations.goHome}</Link></div>}
    </main>
  );
}
