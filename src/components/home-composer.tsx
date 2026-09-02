"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Send } from "lucide-react";
import { sendExploreMessage } from "@/app/actions/explore";
import type { Locale } from "@/i18n/config";

type Messages = {
  placeholder: string;
  send: string;
  opening: string;
  error: string;
  suggestions: string[];
};

export function HomeComposer({ locale, messages }: { locale: Locale; messages: Messages }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;
    setError(false);
    startTransition(async () => {
      const result = await sendExploreMessage(locale, null, content);
      if (result.conversationId) router.push(`/${locale}/explore/${result.conversationId}`);
      else setError(true);
    });
  }

  return (
    <div>
      <form className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60" onSubmit={submit}>
        <textarea autoFocus className="min-h-28 w-full resize-none bg-transparent px-1 text-base leading-7 text-slate-950 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-white" disabled={pending} maxLength={4000} onChange={(event) => { setDraft(event.target.value); setError(false); }} placeholder={messages.placeholder} value={draft} />
        <div className="mt-3 flex justify-end">
          <button aria-label={messages.send} className="flex size-12 cursor-pointer items-center justify-center rounded-2xl bg-violet-700 text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={!draft.trim() || pending} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Send aria-hidden="true" className="size-5" />}</button>
        </div>
      </form>
      {pending ? <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">{messages.opening}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{messages.error}</p> : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {messages.suggestions.map((suggestion) => <button className="min-h-10 cursor-pointer rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 transition hover:border-violet-300 hover:text-violet-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-violet-700 dark:hover:text-violet-300" disabled={pending} key={suggestion} onClick={() => setDraft(suggestion)} type="button">{suggestion}</button>)}
      </div>
    </div>
  );
}
