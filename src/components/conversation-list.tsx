"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowRight, LoaderCircle, MessageCircle, MoreVertical, Trash2 } from "lucide-react";
import { archiveConversation, deleteArchivedConversation, restoreConversation } from "@/app/actions/conversations";
import type { Locale } from "@/i18n/config";

type ConversationItem = {
  id: string;
  title: string | null;
  messageCount: number;
  archivedAt: string | null;
};

type Messages = {
  untitled: string;
  messageCount: string;
  archive: string;
  actions: string;
  restore: string;
  archivedTitle: string;
  delete: string;
  deleteConfirm: string;
  deleteDescription: string;
  cancel: string;
  actionError: string;
};

export function ConversationList({ locale, initialConversations, messages }: {
  locale: Locale;
  initialConversations: ConversationItem[];
  messages: Messages;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeConversations = conversations.filter((conversation) => !conversation.archivedAt);
  const archivedConversations = conversations.filter((conversation) => conversation.archivedAt);

  useEffect(() => {
    function closeMenu(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest("[data-conversation-menu]")) setMenuId(null);
    }
    function closeMenuWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuId(null);
    }
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenuWithKeyboard);
    };
  }, []);

  function archive(id: string) {
    if (isPending) return;
    setPendingId(id);
    setErrorId(null);
    startTransition(async () => {
      const result = await archiveConversation(locale, id);
      if (result.ok) {
        setConversations((current) => current.map((conversation) => conversation.id === id ? { ...conversation, archivedAt: result.archivedAt } : conversation));
        setMenuId(null);
      } else {
        setErrorId(id);
      }
      setPendingId(null);
    });
  }

  function restore(id: string) {
    if (isPending) return;
    setPendingId(id);
    setErrorId(null);
    startTransition(async () => {
      const result = await restoreConversation(locale, id);
      if (result.ok) {
        setConversations((current) => current.map((conversation) => conversation.id === id ? { ...conversation, archivedAt: null } : conversation));
        setDeleteConfirmId(null);
        setMenuId(null);
      } else {
        setErrorId(id);
      }
      setPendingId(null);
    });
  }

  function permanentlyDelete(id: string) {
    if (isPending) return;
    setPendingId(id);
    setErrorId(null);
    startTransition(async () => {
      const result = await deleteArchivedConversation(locale, id);
      if (result.ok) {
        setConversations((current) => current.filter((conversation) => conversation.id !== id));
        setDeleteConfirmId(null);
        setMenuId(null);
      } else {
        setErrorId(id);
      }
      setPendingId(null);
    });
  }

  function conversationCard(conversation: ConversationItem) {
    const pending = isPending && pendingId === conversation.id;
    return (
      <article className="rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/55" key={conversation.id}>
        <div className="flex items-center gap-2">
          <Link className="flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-xl p-1 transition hover:bg-violet-50 dark:hover:bg-violet-950/35" href={`/${locale}/explore/${conversation.id}`}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><MessageCircle aria-hidden="true" className="size-5" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-900 dark:text-white">{conversation.title ?? messages.untitled}</span><span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{messages.messageCount.replace("{count}", String(conversation.messageCount))}</span></span>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          </Link>
          <div className="relative shrink-0" data-conversation-menu>
            <button aria-expanded={menuId === conversation.id} aria-haspopup="menu" aria-label={messages.actions} className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" disabled={isPending} onClick={() => setMenuId((current) => current === conversation.id ? null : conversation.id)} title={messages.actions} type="button">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <MoreVertical aria-hidden="true" className="size-5" />}</button>
            {menuId === conversation.id ? <div className="absolute right-0 top-12 z-10 min-w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900" role="menu">
              {conversation.archivedAt ? <>
                <button className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => restore(conversation.id)} role="menuitem" type="button"><ArchiveRestore aria-hidden="true" className="size-4" />{messages.restore}</button>
                <button className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50" onClick={() => { setDeleteConfirmId(conversation.id); setErrorId(null); setMenuId(null); }} role="menuitem" type="button"><Trash2 aria-hidden="true" className="size-4" />{messages.delete}</button>
              </> : <button className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => archive(conversation.id)} role="menuitem" type="button"><Archive aria-hidden="true" className="size-4" />{messages.archive}</button>}
            </div> : null}
          </div>
        </div>

        {conversation.archivedAt && deleteConfirmId === conversation.id ? (
          <div className="mt-3 rounded-xl bg-red-50 p-4 dark:bg-red-950/40">
            <p className="text-sm leading-6 text-red-900 dark:text-red-100">{messages.deleteDescription}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} onClick={() => permanentlyDelete(conversation.id)} type="button">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />}{messages.deleteConfirm}</button>
              <button className="min-h-11 cursor-pointer rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-900 disabled:opacity-60 dark:border-red-800 dark:text-red-100" disabled={pending} onClick={() => setDeleteConfirmId(null)} type="button">{messages.cancel}</button>
            </div>
          </div>
        ) : null}
        {errorId === conversation.id ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{messages.actionError}</p> : null}
      </article>
    );
  }

  return (
    <div>
      {activeConversations.length ? <div className="mt-7 space-y-3">{activeConversations.map(conversationCard)}</div> : null}
      {archivedConversations.length ? (
        <details className="mt-8 rounded-2xl border border-slate-200/80 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
          <summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-100">{messages.archivedTitle} ({archivedConversations.length})</summary>
          <div className="mt-4 space-y-3">{archivedConversations.map(conversationCard)}</div>
        </details>
      ) : null}
    </div>
  );
}
