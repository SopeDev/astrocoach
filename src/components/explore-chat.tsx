"use client";

import { FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, Check, Lightbulb, LoaderCircle, Mic, RefreshCw, Repeat2, Send, Sparkles, Sprout, Square, X } from "lucide-react";
import Markdown from "react-markdown";
import {
  acceptRecognitionTransition,
  activatePractice,
  declineRecognitionTransition,
  evaluateRecognizeCandidate,
  retryExploreResponse,
  saveRecognizedMapItem,
  sendExploreMessage,
  type ActivePractice,
  type ConversationMessage,
  type ConversationMode,
  type MapItemSaveOffer,
} from "@/app/actions/explore";
import type { Locale } from "@/i18n/config";
import { MAX_RECORDING_SECONDS, MAX_TRANSCRIPT_CHARACTERS } from "@/lib/audio-transcription";
import type { CandidateEvaluationAction, CandidateEvaluationOffer } from "@/lib/recognize-contract";
import type { PracticeProposalOffer } from "@/lib/integrate-contract";
import { formatRecordingTime, useVoiceRecording } from "@/hooks/use-voice-recording";

type Messages = {
  title: string;
  closerTitle: string;
  integrateTitle: string;
  deepExploreTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  inputLabel: string;
  inputPlaceholder: string;
  send: string;
  thinking: string;
  retry: string;
  generationError: string;
  messageError: string;
  backHome: string;
  account: string;
  transitionTitle: string;
  transitionDescription: string;
  integrationRevisionTitle: string;
  integrationRevisionDescription: string;
  deepRecognitionTitle: string;
  deepRecognitionDescription: string;
  transitionAccept: string;
  lookingCloser: string;
  transitionDecline: string;
  candidateEvaluationTitle: string;
  candidateEvaluationDescription: string;
  candidateYesExactly: string;
  candidatePartly: string;
  candidateNo: string;
  candidateLetMeExplain: string;
  patternLabel: string;
  insightLabel: string;
  patternTitle: string;
  patternDescription: string;
  savePattern: string;
  savingPattern: string;
  patternSaved: string;
  viewMap: string;
  returnHome: string;
  openMapItem: string;
  practiceProposalTitle: string;
  practiceProposalDescription: string;
  practiceCueLabel: string;
  activatePractice: string;
  activatingPractice: string;
  activePracticeTitle: string;
  activePracticeDescription: string;
  observationPlaceholder: string;
  actionError: string;
  recordAudio: string;
  recording: string;
  stopRecording: string;
  cancelRecording: string;
  transcribingAudio: string;
  audioUnsupported: string;
  microphoneDenied: string;
  transcriptionError: string;
  noSpeech: string;
  audioTooLarge: string;
  transcriptTooLong: string;
};

function AssistantMessageContent({ content }: { content: string }) {
  return (
    <Markdown components={{
      p: ({ children }) => <p className="mb-3 text-[0.98rem] leading-7 last:mb-0">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>,
      ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
      ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
      li: ({ children }) => <li className="text-[0.98rem] leading-7">{children}</li>,
      a: ({ children, href }) => <a className="font-medium text-violet-700 underline underline-offset-2 dark:text-violet-300" href={href} rel="noreferrer" target="_blank">{children}</a>,
      img: ({ alt }) => <span>{alt ?? ""}</span>,
      h1: ({ children }) => <p className="mb-3 font-semibold last:mb-0">{children}</p>,
      h2: ({ children }) => <p className="mb-3 font-semibold last:mb-0">{children}</p>,
      h3: ({ children }) => <p className="mb-3 font-semibold last:mb-0">{children}</p>,
    }}>{content}</Markdown>
  );
}

export function ExploreChat({ locale, initialConversationId, initialMessages, initialFailedMessageId, initialMode, initialTransitionOffered, initialCandidateEvaluationOffer, initialMapItemSaveOffer, initialPracticeProposalOffer, initialActivePractice, initialClosed, messages, profileInitial }: {
  locale: Locale;
  initialConversationId: string;
  initialMessages: ConversationMessage[];
  initialFailedMessageId: string | null;
  initialMode: ConversationMode;
  initialTransitionOffered: boolean;
  initialCandidateEvaluationOffer: CandidateEvaluationOffer | null;
  initialMapItemSaveOffer: MapItemSaveOffer | null;
  initialPracticeProposalOffer: PracticeProposalOffer | null;
  initialActivePractice: ActivePractice | null;
  initialClosed: boolean;
  messages: Messages;
  profileInitial: string;
}) {
  const [thread, setThread] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [failedMessageId, setFailedMessageId] = useState(initialFailedMessageId);
  const [error, setError] = useState<"message" | "generation" | "action" | null>(initialFailedMessageId ? "generation" : null);
  const [mode, setMode] = useState<ConversationMode>(initialMode);
  const [transitionOffered, setTransitionOffered] = useState(initialTransitionOffered);
  const [candidateEvaluationOffer, setCandidateEvaluationOffer] = useState(initialCandidateEvaluationOffer);
  const [mapItemSaveOffer, setMapItemSaveOffer] = useState(initialMapItemSaveOffer);
  const [practiceProposal, setPracticeProposal] = useState(initialPracticeProposalOffer);
  const [activePractice, setActivePractice] = useState(initialActivePractice);
  const [closed, setClosed] = useState(initialClosed);
  const [mapItemSaved, setMapItemSaved] = useState(initialClosed && Boolean(initialMapItemSaveOffer?.mapItemId));
  const [savingMapItem, setSavingMapItem] = useState(false);
  const [practicePending, setPracticePending] = useState(false);
  const [transitionPending, setTransitionPending] = useState(false);
  const [evaluationPending, setEvaluationPending] = useState<CandidateEvaluationAction | null>(null);
  const [pending, startTransition] = useTransition();
  const hasScrolledOnLoad = useRef(false);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const { audioStatus, audioError, recordingSeconds, startRecording, stopRecording, cancelRecording, clearAudioError } = useVoiceRecording({
    locale,
    disabled: pending || Boolean(failedMessageId),
    onTranscript(transcript) {
      const combinedDraft = draft.trim() ? `${draft.trim()} ${transcript}` : transcript;
      if (combinedDraft.length > MAX_TRANSCRIPT_CHARACTERS) return false;
      setDraft(combinedDraft);
      window.requestAnimationFrame(() => composerInput.current?.focus());
      return true;
    },
  });

  useLayoutEffect(() => {
    const textarea = composerInput.current;
    if (!textarea) return;

    function resizeComposer() {
      if (!textarea) return;
      textarea.style.height = "auto";
      const maximumHeight = Math.max(48, Math.floor(window.innerHeight / 3));
      const nextHeight = Math.min(textarea.scrollHeight, maximumHeight);
      textarea.style.height = `${Math.max(48, nextHeight)}px`;
      textarea.style.overflowY = textarea.scrollHeight > maximumHeight ? "auto" : "hidden";
    }

    resizeComposer();
    window.addEventListener("resize", resizeComposer);
    return () => window.removeEventListener("resize", resizeComposer);
  }, [draft]);

  useEffect(() => {
    const behavior: ScrollBehavior = hasScrolledOnLoad.current ? "smooth" : "auto";
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
      });
    });
    hasScrolledOnLoad.current = true;

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [activePractice, candidateEvaluationOffer, closed, mapItemSaveOffer, mapItemSaved, pending, practiceProposal, thread, transitionOffered]);

  function applyResult(result: Extract<Awaited<ReturnType<typeof sendExploreMessage>>, { ok: true }>, optimisticId?: string) {
    setThread((existing) => {
      const withoutOptimistic = optimisticId ? existing.filter((message) => message.id !== optimisticId) : existing;
      const withUser = result.userMessage && !withoutOptimistic.some((message) => message.id === result.userMessage?.id) ? [...withoutOptimistic, result.userMessage] : withoutOptimistic;
      return withUser.some((message) => message.id === result.assistantMessage.id) ? withUser : [...withUser, result.assistantMessage];
    });
    setMode(result.mode);
    setTransitionOffered(result.transitionOffered);
    setCandidateEvaluationOffer(result.candidateEvaluationOffer);
    setMapItemSaveOffer(result.mapItemSaveOffer);
    setPracticeProposal(result.practiceProposalOffer);
    setActivePractice(result.activePractice);
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || pending || failedMessageId || closed || audioStatus !== "idle") {
      if (!content) setError("message");
      return;
    }

    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: ConversationMessage = { id: optimisticId, role: "user", mode, content, createdAt: new Date().toISOString() };
    setThread((existing) => [...existing, optimisticMessage]);
    setDraft("");
    setError(null);

    startTransition(async () => {
      const result = await sendExploreMessage(locale, initialConversationId, content);
      if (result.ok) {
        applyResult(result, optimisticId);
        return;
      }
      if (result.error === "generation" && result.userMessage) {
        setThread((existing) => [...existing.filter((message) => message.id !== optimisticId), result.userMessage!]);
        setFailedMessageId(result.userMessage.id);
        setError("generation");
      } else {
        setThread((existing) => existing.filter((message) => message.id !== optimisticId));
        setDraft(content);
        setError("message");
      }
    });
  }

  function retry() {
    if (!failedMessageId || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await retryExploreResponse(locale, initialConversationId, failedMessageId);
      if (result.ok) {
        applyResult(result);
        setFailedMessageId(null);
      } else {
        setError(result.error);
      }
    });
  }

  function acceptTransition() {
    if (pending) return;
    setError(null);
    setTransitionPending(true);
    startTransition(async () => {
      try {
        const result = await acceptRecognitionTransition(locale, initialConversationId);
        if (result.ok) {
          setThread((existing) => [...existing, result.assistantMessage]);
          setMode(result.mode);
          setTransitionOffered(false);
          setCandidateEvaluationOffer(result.candidateEvaluationOffer);
          return;
        }
        setError("action");
      } catch {
        setError("action");
      } finally {
        setTransitionPending(false);
      }
    });
  }

  function evaluateCandidate(action: CandidateEvaluationAction) {
    if (!candidateEvaluationOffer || pending) return;
    setError(null);
    setEvaluationPending(action);
    startTransition(async () => {
      try {
        const result = await evaluateRecognizeCandidate(locale, initialConversationId, candidateEvaluationOffer.messageId, action);
        if (!result.ok) {
          setError("action");
          return;
        }
        setMode(result.mode);
        setCandidateEvaluationOffer(result.candidateEvaluationOffer);
        setMapItemSaveOffer(result.mapItemSaveOffer);
        if (action === "PARTLY" || action === "LET_ME_EXPLAIN" || action === "NO") {
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => composerInput.current?.focus()));
        }
      } catch {
        setError("action");
      } finally {
        setEvaluationPending(null);
      }
    });
  }

  function declineTransition() {
    if (pending) return;
    setTransitionOffered(false);
    startTransition(async () => {
      try {
        const result = await declineRecognitionTransition(locale, initialConversationId);
        if (result.ok) return;
        setTransitionOffered(true);
        setError("action");
      } catch {
        setTransitionOffered(true);
        setError("action");
      }
    });
  }

  function saveMapItem() {
    if (!mapItemSaveOffer || pending) return;
    setError(null);
    setSavingMapItem(true);
    startTransition(async () => {
      try {
        const result = await saveRecognizedMapItem(locale, initialConversationId, mapItemSaveOffer.messageId);
        if (result.ok) {
          setMapItemSaveOffer((offer) => offer ? { ...offer, mapItemId: result.mapItemId } : offer);
          setMapItemSaved(true);
          setClosed(true);
        } else {
          setError("action");
        }
      } catch {
        setError("action");
      } finally {
        setSavingMapItem(false);
      }
    });
  }

  function activateProposedPractice() {
    if (!practiceProposal || pending) return;
    setError(null);
    setPracticePending(true);
    startTransition(async () => {
      try {
        const result = await activatePractice(locale, initialConversationId, practiceProposal.messageId);
        if (result.ok) {
          setActivePractice(result.activePractice);
          setPracticeProposal(null);
          window.requestAnimationFrame(() => composerInput.current?.focus());
        } else setError("action");
      } catch {
        setError("action");
      } finally {
        setPracticePending(false);
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const audioErrorMessage = audioError === "unsupported" ? messages.audioUnsupported
    : audioError === "permission" ? messages.microphoneDenied
      : audioError === "noSpeech" ? messages.noSpeech
        : audioError === "tooLarge" ? messages.audioTooLarge
          : audioError === "transcriptTooLong" ? messages.transcriptTooLong
            : audioError === "transcription" ? messages.transcriptionError
              : null;

  return (
    <main className="flex min-h-svh flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[color:var(--background)]/90 px-5 py-4 backdrop-blur dark:border-slate-800/80">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Link aria-label={messages.backHome} className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-white dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900" href={`/${locale}/home`}><ArrowLeft aria-hidden="true" className="size-4" /></Link><div><h1 className="text-lg font-semibold tracking-tight">{messages.title}</h1>{mode === "RECOGNIZE" ? <p className="text-xs font-medium text-violet-600 dark:text-violet-300">{messages.closerTitle}</p> : mode === "INTEGRATE" ? <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{messages.integrateTitle}</p> : mode === "DEEP_EXPLORE" ? <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{messages.deepExploreTitle}</p> : null}</div></div>
          <Link aria-label={messages.account} className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-violet-700 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500" href={`/${locale}/account`}>{profileInitial}</Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5">
        <div className="flex-1 py-6">
          {thread.length === 0 ? <div className="flex min-h-[45svh] flex-col justify-center text-center"><h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.emptyTitle}</h2><p className="mx-auto mt-3 max-w-sm text-pretty leading-7 text-slate-600 dark:text-slate-300">{messages.emptyDescription}</p></div> : (
            <div className="space-y-5" aria-live="polite">
              {thread.map((message) => <article className={message.role === "user" ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-violet-700 px-4 py-3 text-white dark:bg-violet-600" : "mr-auto max-w-[92%] text-slate-800 dark:text-slate-100"} key={message.id} translate="no">{message.role === "user" ? <p className="whitespace-pre-wrap text-[0.98rem] leading-7">{message.content}</p> : <AssistantMessageContent content={message.content} />}</article>)}
              {pending && !savingMapItem && !practicePending && !transitionPending && !evaluationPending ? <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />{messages.thinking}</div> : null}
              {failedMessageId && !pending ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"><p>{messages.generationError}</p><button className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-amber-300 px-4 py-2 font-semibold transition hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-950" onClick={retry} type="button"><RefreshCw aria-hidden="true" className="size-4" />{messages.retry}</button></div> : null}
              {transitionOffered && !failedMessageId ? <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/45"><Sparkles aria-hidden="true" className="size-5 text-violet-700 dark:text-violet-300" /><h2 className="mt-3 font-semibold text-slate-950 dark:text-white">{mode === "INTEGRATE" ? messages.integrationRevisionTitle : mode === "DEEP_EXPLORE" ? messages.deepRecognitionTitle : messages.transitionTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{mode === "INTEGRATE" ? messages.integrationRevisionDescription : mode === "DEEP_EXPLORE" ? messages.deepRecognitionDescription : messages.transitionDescription}</p><div className="mt-4 grid gap-2"><button className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white transition hover:bg-violet-800 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={pending} onClick={acceptTransition} type="button">{transitionPending ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />{messages.lookingCloser}</> : messages.transitionAccept}</button><button className="min-h-11 cursor-pointer rounded-xl px-4 py-2 font-semibold text-slate-600 transition hover:bg-white/70 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-900/60" disabled={pending} onClick={declineTransition} type="button">{messages.transitionDecline}</button></div></section> : null}
              {candidateEvaluationOffer && !failedMessageId ? <section aria-labelledby="candidate-evaluation-title" className="rounded-3xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/45"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-700 dark:text-violet-300">{candidateEvaluationOffer.item.kind === "PATTERN" ? <Repeat2 aria-hidden="true" className="size-4" /> : <Lightbulb aria-hidden="true" className="size-4" />}{candidateEvaluationOffer.item.kind === "PATTERN" ? messages.patternLabel : messages.insightLabel}</div><h2 className="mt-3 font-semibold text-slate-950 dark:text-white" id="candidate-evaluation-title">{messages.candidateEvaluationTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.candidateEvaluationDescription}</p><div className="mt-4 grid grid-cols-2 gap-2"><button className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-700 px-3 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 active:scale-[0.98] disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={pending} onClick={() => evaluateCandidate("YES_EXACTLY")} type="button">{evaluationPending === "YES_EXACTLY" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}{messages.candidateYesExactly}</button><button className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white px-3 py-3 text-sm font-semibold text-violet-900 transition hover:bg-violet-100 active:scale-[0.98] disabled:opacity-60 dark:border-violet-700 dark:bg-slate-950 dark:text-violet-100 dark:hover:bg-violet-950" disabled={pending} onClick={() => evaluateCandidate("PARTLY")} type="button">{evaluationPending === "PARTLY" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}{messages.candidatePartly}</button><button className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900" disabled={pending} onClick={() => evaluateCandidate("NO")} type="button">{evaluationPending === "NO" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}{messages.candidateNo}</button><button className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900" disabled={pending} onClick={() => evaluateCandidate("LET_ME_EXPLAIN")} type="button">{evaluationPending === "LET_ME_EXPLAIN" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}{messages.candidateLetMeExplain}</button></div></section> : null}
              {mapItemSaveOffer ? <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">{mapItemSaved ? <Check aria-hidden="true" className="size-5 text-emerald-700 dark:text-emerald-300" /> : <Bookmark aria-hidden="true" className="size-5 text-emerald-700 dark:text-emerald-300" />}<div className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">{mapItemSaveOffer.kind === "PATTERN" ? messages.patternLabel : messages.insightLabel}</div><h2 className="mt-2 font-semibold text-slate-950 dark:text-white">{mapItemSaved ? messages.patternSaved : messages.patternTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{mapItemSaveOffer.statement}</p>{mapItemSaved ? <div className="mt-4 grid grid-cols-2 gap-2">{mapItemSaveOffer.mapItemId ? <Link className="flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white" href={`/${locale}/map/${mapItemSaveOffer.mapItemId}`}>{messages.openMapItem}</Link> : <Link className="flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white" href={`/${locale}/map`}>{messages.viewMap}</Link>}<Link className="flex min-h-11 items-center justify-center rounded-xl border border-emerald-300 px-3 py-2 text-center text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:text-emerald-100" href={`/${locale}/home`}>{messages.returnHome}</Link></div> : <><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.patternDescription}</p><button className="mt-4 min-h-12 w-full cursor-pointer rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60" disabled={pending} onClick={saveMapItem} type="button">{savingMapItem ? messages.savingPattern : messages.savePattern}</button></>}</section> : null}
              {practiceProposal && !failedMessageId ? <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40"><Sprout aria-hidden="true" className="size-5 text-emerald-700 dark:text-emerald-300" /><h2 className="mt-3 font-semibold text-slate-950 dark:text-white">{messages.practiceProposalTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.practiceProposalDescription}</p><p className="mt-3 leading-7 text-slate-900 dark:text-slate-100">{practiceProposal.proposal.instruction}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold">{messages.practiceCueLabel}:</span> {practiceProposal.proposal.cue}</p><button className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} onClick={activateProposedPractice} type="button">{practicePending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}{practicePending ? messages.activatingPractice : messages.activatePractice}</button></section> : null}
              {mode === "INTEGRATE" && activePractice && !practiceProposal ? <section className="rounded-3xl border border-slate-200 bg-white/70 p-5 dark:border-slate-800 dark:bg-slate-950/45"><Sprout aria-hidden="true" className="size-5 text-emerald-700 dark:text-emerald-300" /><h2 className="mt-3 font-semibold text-slate-950 dark:text-white">{messages.activePracticeTitle}</h2><p className="mt-2 leading-7 text-slate-800 dark:text-slate-100">{activePractice.instruction}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold">{messages.practiceCueLabel}:</span> {activePractice.cue}</p><p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{messages.activePracticeDescription}</p></section> : null}
              {error === "action" ? <p className="text-sm text-red-700 dark:text-red-300" role="alert">{messages.actionError}</p> : null}
            </div>
          )}
        </div>

        {!closed && !transitionOffered && !candidateEvaluationOffer && !mapItemSaveOffer && !practiceProposal ? (
          <form className="sticky bottom-0 border-t border-slate-200/70 bg-[color:var(--background)]/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur dark:border-slate-800/80" onSubmit={submit}>
            {audioStatus === "recording" ? (
              <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/45">
                <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-red-600" />
                <span className="min-w-0 flex-1 text-sm font-semibold text-red-900 dark:text-red-100">{messages.recording} · {formatRecordingTime(recordingSeconds)} / {formatRecordingTime(MAX_RECORDING_SECONDS)}</span>
                <button aria-label={messages.cancelRecording} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-red-800 transition hover:bg-red-100 active:scale-95 dark:text-red-200 dark:hover:bg-red-900/60" onClick={cancelRecording} type="button"><X aria-hidden="true" className="size-5" /></button>
                <button aria-label={messages.stopRecording} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-red-600 text-white shadow-sm transition hover:bg-red-700 active:scale-95" onClick={stopRecording} type="button"><Square aria-hidden="true" className="size-4 fill-current" /></button>
              </div>
            ) : (
              <>
                <label className="sr-only" htmlFor="explore-message">{messages.inputLabel}</label>
                <div className="flex items-end gap-2 sm:gap-3">
                  <textarea className="min-h-12 flex-1 resize-none overflow-y-hidden rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white" disabled={pending || audioStatus === "transcribing" || Boolean(failedMessageId)} id="explore-message" maxLength={MAX_TRANSCRIPT_CHARACTERS} onChange={(event) => { setDraft(event.target.value); clearAudioError(); if (event.target.value.trim()) setError(null); }} onKeyDown={handleKeyDown} placeholder={mode === "INTEGRATE" && activePractice ? messages.observationPlaceholder : messages.inputPlaceholder} ref={composerInput} rows={1} value={draft} />
                  <button aria-label={audioStatus === "transcribing" ? messages.transcribingAudio : messages.recordAudio} className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800" disabled={pending || audioStatus === "transcribing" || Boolean(failedMessageId)} onClick={startRecording} type="button">{audioStatus === "transcribing" ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Mic aria-hidden="true" className="size-5" />}</button>
                  <button aria-label={messages.send} className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-violet-700 text-white shadow-sm transition hover:bg-violet-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={pending || audioStatus === "transcribing" || Boolean(failedMessageId) || !draft.trim()} type="submit"><Send aria-hidden="true" className="size-5" /></button>
                </div>
              </>
            )}
            {audioStatus === "transcribing" ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400" role="status">{messages.transcribingAudio}</p> : null}
            {audioErrorMessage ? <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{audioErrorMessage}</p> : null}
            {error === "message" ? <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{messages.messageError}</p> : null}
          </form>
        ) : null}
      </div>
    </main>
  );
}
