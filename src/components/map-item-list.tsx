"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Check, Lightbulb, LoaderCircle, Pencil, Repeat2, X } from "lucide-react";
import { archiveMapItem, restoreMapItem, updateMapItem } from "@/app/actions/map-items";
import type { Locale } from "@/i18n/config";
import type { MapItemKind } from "@/lib/recognize-contract";

type MapItem = { id: string; kind: MapItemKind; statement: string; archivedAt: string | null };

type Messages = {
  patternLabel: string;
  insightLabel: string;
  edit: string;
  editTitle: string;
  save: string;
  cancel: string;
  archive: string;
  archiveConfirm: string;
  archiveDescription: string;
  restore: string;
  archivedTitle: string;
  actionError: string;
  openItem: string;
};

export function MapItemList({ locale, initialItems, messages }: { locale: Locale; initialItems: MapItem[]; messages: Messages }) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [errorId, setErrorId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeItems = items.filter((item) => !item.archivedAt);
  const archivedItems = items.filter((item) => item.archivedAt);

  function beginEditing(item: MapItem) {
    setEditingId(item.id);
    setArchiveConfirmId(null);
    setDraft(item.statement);
    setErrorId(null);
  }

  function saveEdit(itemId: string) {
    const statement = draft.trim();
    if (!statement || isPending) return;
    setPendingId(itemId);
    setErrorId(null);
    startTransition(async () => {
      const result = await updateMapItem(locale, itemId, statement);
      if (result.ok) {
        setItems((current) => current.map((item) => item.id === itemId ? { ...item, statement: result.statement } : item));
        setEditingId(null);
      } else setErrorId(itemId);
      setPendingId(null);
    });
  }

  function archive(itemId: string) {
    if (isPending) return;
    setPendingId(itemId);
    setErrorId(null);
    startTransition(async () => {
      const result = await archiveMapItem(locale, itemId);
      if (result.ok) {
        setItems((current) => current.map((item) => item.id === itemId ? { ...item, archivedAt: result.archivedAt } : item));
        setArchiveConfirmId(null);
        setEditingId(null);
      } else setErrorId(itemId);
      setPendingId(null);
    });
  }

  function restore(itemId: string) {
    if (isPending) return;
    setPendingId(itemId);
    setErrorId(null);
    startTransition(async () => {
      const result = await restoreMapItem(locale, itemId);
      if (result.ok) setItems((current) => current.map((item) => item.id === itemId ? { ...item, archivedAt: null } : item));
      else setErrorId(itemId);
      setPendingId(null);
    });
  }

  function itemCard(item: MapItem) {
    const pending = isPending && pendingId === item.id;
    const ItemIcon = item.kind === "PATTERN" ? Repeat2 : Lightbulb;
    return (
      <article className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/55" key={item.id}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-700 dark:text-violet-300"><ItemIcon aria-hidden="true" className="size-4" />{item.kind === "PATTERN" ? messages.patternLabel : messages.insightLabel}</div>
        {editingId === item.id ? (
          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor={`map-item-${item.id}`}>{messages.editTitle}</label>
            <textarea autoFocus className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-base leading-7 text-slate-950 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white" disabled={pending} id={`map-item-${item.id}`} maxLength={500} onChange={(event) => { setDraft(event.target.value); setErrorId(null); }} value={draft} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 dark:bg-violet-600" disabled={pending || !draft.trim()} onClick={() => saveEdit(item.id)} type="button">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}{messages.save}</button>
              <button className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200" disabled={pending} onClick={() => setEditingId(null)} type="button"><X aria-hidden="true" className="size-4" />{messages.cancel}</button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-800 dark:text-slate-100">{item.statement}</p>
            {item.archivedAt ? (
              <button className="mt-4 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-200" disabled={pending} onClick={() => restore(item.id)} type="button">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ArchiveRestore aria-hidden="true" className="size-4" />}{messages.restore}</button>
            ) : archiveConfirmId === item.id ? (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/40">
                <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">{messages.archiveDescription}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} onClick={() => archive(item.id)} type="button">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Archive aria-hidden="true" className="size-4" />}{messages.archiveConfirm}</button>
                  <button className="min-h-11 cursor-pointer rounded-xl border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-900 disabled:opacity-60 dark:border-amber-800 dark:text-amber-100" disabled={pending} onClick={() => setArchiveConfirmId(null)} type="button">{messages.cancel}</button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Link className="col-span-2 flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-3 py-2 text-center text-sm font-semibold text-white sm:col-span-1" href={`/${locale}/map/${item.id}`}>{messages.openItem}</Link>
                <button aria-label={messages.edit} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-2 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={() => beginEditing(item)} type="button"><Pencil aria-hidden="true" className="size-4" />{messages.edit}</button>
                <button aria-label={messages.archive} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-2 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={() => { setArchiveConfirmId(item.id); setEditingId(null); setErrorId(null); }} type="button"><Archive aria-hidden="true" className="size-4" />{messages.archive}</button>
              </div>
            )}
          </>
        )}
        {errorId === item.id ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{messages.actionError}</p> : null}
      </article>
    );
  }

  return <>{activeItems.length ? <div className="mt-3 space-y-3">{activeItems.map(itemCard)}</div> : null}{archivedItems.length ? <details className="mt-8 rounded-2xl border border-slate-200/80 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-950/35"><summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-100">{messages.archivedTitle} ({archivedItems.length})</summary><div className="mt-4 space-y-3">{archivedItems.map(itemCard)}</div></details> : null}</>;
}
