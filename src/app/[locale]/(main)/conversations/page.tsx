import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";
import { ConversationList } from "@/components/conversation-list";
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
  const activeConversations = conversations.filter((conversation) => !conversation.archivedAt);

  return (
    <main>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.conversations.title}</h1><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{messages.conversations.description}</p></div>
        <Link className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500" href={`/${locale}/home#new-conversation`}><Plus aria-hidden="true" className="size-4" />{messages.conversations.newConversation}</Link>
      </div>
      {!activeConversations.length ? <div className="mt-10 rounded-3xl border border-dashed border-slate-300 p-7 text-center dark:border-slate-700"><MessageCircle aria-hidden="true" className="mx-auto size-7 text-violet-600 dark:text-violet-300" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{messages.conversations.emptyTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.conversations.emptyDescription}</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-2 font-semibold text-white dark:bg-violet-600" href={`/${locale}/home#new-conversation`}>{messages.conversations.newConversation}</Link></div> : null}
      <ConversationList initialConversations={conversations.map((conversation) => ({ id: conversation.id, title: conversation.title, messageCount: conversation._count.messages, archivedAt: conversation.archivedAt?.toISOString() ?? null }))} locale={locale} messages={messages.conversations} />
    </main>
  );
}
