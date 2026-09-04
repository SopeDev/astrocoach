"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Check, LoaderCircle, Pencil, Repeat2, X } from "lucide-react";
import { archivePattern, restorePattern, updatePattern } from "@/app/actions/patterns";
import type { Locale } from "@/i18n/config";

type PatternItem = {
  id: string;
  statement: string;
  archivedAt: string | null;
};

type Messages = {
  patternLabel: string;
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
};

export function PatternList({ locale, initialPatterns, messages }: {
  locale: Locale;
  initialPatterns: PatternItem[];
  messages: Messages;
}) {
  const [patterns, setPatterns] = useState(initialPatterns);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [errorId, setErrorId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activePatterns = patterns.filter((pattern) => !pattern.archivedAt);
  const archivedPatterns = patterns.filter((pattern) => pattern.archivedAt);

  function beginEditing(pattern: PatternItem) {
    setEditingId(pattern.id);
    setArchiveConfirmId(null);
    setDraft(pattern.statement);
    setErrorId(null);
  }

  function saveEdit(patternId: string) {
    const statement = draft.trim();
    if (!statement || isPending) return;
    setPendingId(patternId);
    setErrorId(null);
    startTransition(async () => {
      const result = await updatePattern(locale, patternId, statement);
      if (result.ok) {
        setPatterns((current) => current.map((pattern) => pattern.id === patternId ? { ...pattern, statement: result.statement } : pattern));
        setEditingId(null);
      } else {
        setErrorId(patternId);
      }
      setPendingId(null);
    });
  }

  function archive(patternId: string) {
    if (isPending) return;
    setPendingId(patternId);
    setErrorId(null);
    startTransition(async () => {
      const result = await archivePattern(locale, patternId);
      if (result.ok) {
        setPatterns((current) => current.map((pattern) => pattern.id === patternId ? { ...pattern, archivedAt: result.archivedAt } : pattern));
        setArchiveConfirmId(null);
        setEditingId(null);
      } else {
        setErrorId(patternId);
      }
      setPendingId(null);
    });
  }

  function restore(patternId: string) {
    if (isPending) return;
    setPendingId(patternId);
    setErrorId(null);
    startTransition(async () => {
      const result = await restorePattern(locale, patternId);
      if (result.ok) {
        setPatterns((current) => current.map((pattern) => pattern.id === patternId ? { ...pattern, archivedAt: null } : pattern));
      } else {
        setErrorId(patternId);
      }
      setPendingId(null);
    });
  }

  function patternCard(pattern: PatternItem) {
    const pending = isPending && pendingId === pattern.id;
    return (
      <article className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/55" key={pattern.id}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-700 dark:text-violet-300"><Repeat2 aria-hidden="true" className="size-4" />{messages.patternLabel}</div>
        {editingId === pattern.id ? (
          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor={`pattern-${pattern.id}`}>{messages.editTitle}</label>
            <textarea autoFocus className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-base leading-7 text-slate-950 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white" disabled={pending} id={`pattern-${pattern.id}`} maxLength={500} onChange={(event) => { setDraft(event.target.value); setErrorId(null); }} value={draft} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 dark:bg-violet-600" disabled={pending || !draft.trim()} onClick={() => saveEdit(pattern.id)} type="button">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}{messages.save}</button>
              <button className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200" disabled={pending} onClick={() => setEditingId(null)} type="button"><X aria-hidden="true" className="size-4" />{messages.cancel}</button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-800 dark:text-slate-100">{pattern.statement}</p>
            {pattern.archivedAt ? (
              <button className="mt-4 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-200" disabled={pending} onClick={() => restore(pattern.id)} type="button">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ArchiveRestore aria-hidden="true" className="size-4" />}{messages.restore}</button>
            ) : archiveConfirmId === pattern.id ? (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/40">
                <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">{messages.archiveDescription}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} onClick={() => archive(pattern.id)} type="button">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Archive aria-hidden="true" className="size-4" />}{messages.archiveConfirm}</button>
                  <button className="min-h-11 cursor-pointer rounded-xl border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-900 disabled:opacity-60 dark:border-amber-800 dark:text-amber-100" disabled={pending} onClick={() => setArchiveConfirmId(null)} type="button">{messages.cancel}</button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button aria-label={messages.edit} className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={() => beginEditing(pattern)} type="button"><Pencil aria-hidden="true" className="size-4" />{messages.edit}</button>
                <button aria-label={messages.archive} className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={() => { setArchiveConfirmId(pattern.id); setEditingId(null); setErrorId(null); }} type="button"><Archive aria-hidden="true" className="size-4" />{messages.archive}</button>
              </div>
            )}
          </>
        )}
        {errorId === pattern.id ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{messages.actionError}</p> : null}
      </article>
    );
  }

  return (
    <>
      {activePatterns.length ? <div className="mt-3 space-y-3">{activePatterns.map(patternCard)}</div> : null}
      {archivedPatterns.length ? (
        <details className="mt-8 rounded-2xl border border-slate-200/80 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-950/35">
          <summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-100">{messages.archivedTitle} ({archivedPatterns.length})</summary>
          <div className="mt-4 space-y-3">{archivedPatterns.map(patternCard)}</div>
        </details>
      ) : null}
    </>
  );
}
