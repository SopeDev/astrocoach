"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Mic, Send, Square, X } from "lucide-react";
import { sendExploreMessage } from "@/app/actions/explore";
import type { Locale } from "@/i18n/config";
import { formatRecordingTime, useVoiceRecording } from "@/hooks/use-voice-recording";
import { MAX_RECORDING_SECONDS, MAX_TRANSCRIPT_CHARACTERS } from "@/lib/audio-transcription";

type Messages = {
  placeholder: string;
  send: string;
  opening: string;
  error: string;
  suggestions: string[];
};

type VoiceMessages = {
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

export function HomeComposer({ locale, messages, voiceMessages }: { locale: Locale; messages: Messages; voiceMessages: VoiceMessages }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const { audioStatus, audioError, recordingSeconds, startRecording, stopRecording, cancelRecording, clearAudioError } = useVoiceRecording({
    locale,
    disabled: pending,
    onTranscript(transcript) {
      const combinedDraft = draft.trim() ? `${draft.trim()} ${transcript}` : transcript;
      if (combinedDraft.length > MAX_TRANSCRIPT_CHARACTERS) return false;
      setDraft(combinedDraft);
      window.requestAnimationFrame(() => composerInput.current?.focus());
      return true;
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending || audioStatus !== "idle") return;
    setError(false);
    startTransition(async () => {
      const result = await sendExploreMessage(locale, null, content);
      if (result.conversationId) router.push(`/${locale}/explore/${result.conversationId}`);
      else setError(true);
    });
  }

  const audioErrorMessage = audioError === "unsupported" ? voiceMessages.audioUnsupported
    : audioError === "permission" ? voiceMessages.microphoneDenied
      : audioError === "noSpeech" ? voiceMessages.noSpeech
        : audioError === "tooLarge" ? voiceMessages.audioTooLarge
          : audioError === "transcriptTooLong" ? voiceMessages.transcriptTooLong
            : audioError === "transcription" ? voiceMessages.transcriptionError
              : null;

  return (
    <div>
      <form className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60" id="new-conversation" onSubmit={submit}>
        {audioStatus === "recording" ? (
          <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/45">
            <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-red-600" />
            <span className="min-w-0 flex-1 text-sm font-semibold text-red-900 dark:text-red-100">{voiceMessages.recording} · {formatRecordingTime(recordingSeconds)} / {formatRecordingTime(MAX_RECORDING_SECONDS)}</span>
            <button aria-label={voiceMessages.cancelRecording} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-red-800 transition hover:bg-red-100 active:scale-95 dark:text-red-200 dark:hover:bg-red-900/60" onClick={cancelRecording} type="button"><X aria-hidden="true" className="size-5" /></button>
            <button aria-label={voiceMessages.stopRecording} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-red-600 text-white shadow-sm transition hover:bg-red-700 active:scale-95" onClick={stopRecording} type="button"><Square aria-hidden="true" className="size-4 fill-current" /></button>
          </div>
        ) : (
          <>
            <textarea autoFocus className="min-h-28 w-full resize-none bg-transparent px-1 text-base leading-7 text-slate-950 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-white" disabled={pending || audioStatus === "transcribing"} maxLength={MAX_TRANSCRIPT_CHARACTERS} onChange={(event) => { setDraft(event.target.value); setError(false); clearAudioError(); }} placeholder={messages.placeholder} ref={composerInput} value={draft} />
            <div className="mt-3 flex justify-end gap-2">
              <button aria-label={audioStatus === "transcribing" ? voiceMessages.transcribingAudio : voiceMessages.recordAudio} className="flex size-12 cursor-pointer items-center justify-center rounded-2xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:cursor-wait disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" disabled={pending || audioStatus === "transcribing"} onClick={startRecording} type="button">{audioStatus === "transcribing" ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Mic aria-hidden="true" className="size-5" />}</button>
              <button aria-label={messages.send} className="flex size-12 cursor-pointer items-center justify-center rounded-2xl bg-violet-700 text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={!draft.trim() || pending || audioStatus === "transcribing"} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Send aria-hidden="true" className="size-5" />}</button>
            </div>
          </>
        )}
        {audioStatus === "transcribing" ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400" role="status">{voiceMessages.transcribingAudio}</p> : null}
        {audioErrorMessage ? <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{audioErrorMessage}</p> : null}
      </form>
      {pending ? <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">{messages.opening}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{messages.error}</p> : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {messages.suggestions.map((suggestion) => <button className="min-h-10 cursor-pointer rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-violet-700 dark:hover:text-violet-300" disabled={pending || audioStatus !== "idle"} key={suggestion} onClick={() => { setDraft(suggestion); clearAudioError(); }} type="button">{suggestion}</button>)}
      </div>
    </div>
  );
}
