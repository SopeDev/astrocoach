"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { audioFileExtension, MAX_RECORDING_SECONDS } from "@/lib/audio-transcription";

export type AudioError = "unsupported" | "permission" | "transcription" | "noSpeech" | "tooLarge" | "transcriptTooLong";
export type AudioStatus = "idle" | "recording" | "transcribing";

const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

export function formatRecordingTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function useVoiceRecording({ locale, disabled, onTranscript }: {
  locale: Locale;
  disabled: boolean;
  onTranscript: (transcript: string) => boolean;
}) {
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [audioError, setAudioError] = useState<AudioError | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const discardRecording = useRef(false);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  function clearRecordingTimers() {
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    if (recordingTimeout.current) clearTimeout(recordingTimeout.current);
    recordingInterval.current = null;
    recordingTimeout.current = null;
  }

  function releaseMicrophone() {
    mediaStream.current?.getTracks().forEach((track) => track.stop());
    mediaStream.current = null;
    clearRecordingTimers();
  }

  useEffect(() => () => {
    discardRecording.current = true;
    if (mediaRecorder.current?.state === "recording") mediaRecorder.current.stop();
    mediaStream.current?.getTracks().forEach((track) => track.stop());
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    if (recordingTimeout.current) clearTimeout(recordingTimeout.current);
  }, []);

  async function transcribeRecording(blob: Blob) {
    setAudioStatus("transcribing");
    setAudioError(null);
    const formData = new FormData();
    formData.append("audio", blob, `recording.${audioFileExtension(blob.type)}`);
    formData.append("locale", locale);

    try {
      const response = await fetch("/api/transcriptions", { method: "POST", body: formData });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok || !result.text) {
        setAudioError(result.error === "no_speech" ? "noSpeech"
          : result.error === "too_large" ? "tooLarge"
            : result.error === "transcript_too_long" ? "transcriptTooLong"
              : "transcription");
        return;
      }

      if (!onTranscriptRef.current(result.text)) setAudioError("transcriptTooLong");
    } catch {
      setAudioError("transcription");
    } finally {
      setAudioStatus("idle");
    }
  }

  async function startRecording() {
    if (disabled || audioStatus !== "idle") return;
    setAudioError(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAudioError("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      const mimeType = RECORDING_MIME_TYPES.find((value) => MediaRecorder.isTypeSupported(value));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : { audioBitsPerSecond: 48_000 });
      mediaRecorder.current = recorder;
      audioChunks.current = [];
      discardRecording.current = false;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const shouldDiscard = discardRecording.current;
        const blob = new Blob(audioChunks.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        audioChunks.current = [];
        mediaRecorder.current = null;
        discardRecording.current = true;
        releaseMicrophone();
        if (shouldDiscard) {
          setAudioStatus("idle");
          return;
        }
        void transcribeRecording(blob);
      }, { once: true });
      recorder.addEventListener("error", () => {
        releaseMicrophone();
        setAudioStatus("idle");
        setAudioError("transcription");
      }, { once: true });

      recorder.start(1000);
      setRecordingSeconds(0);
      setAudioStatus("recording");
      recordingInterval.current = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
      recordingTimeout.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, MAX_RECORDING_SECONDS * 1000);
    } catch {
      releaseMicrophone();
      setAudioError("permission");
    }
  }

  function stopRecording() {
    if (mediaRecorder.current?.state !== "recording") return;
    clearRecordingTimers();
    setAudioStatus("transcribing");
    mediaRecorder.current.stop();
  }

  function cancelRecording() {
    if (mediaRecorder.current?.state !== "recording") return;
    discardRecording.current = true;
    clearRecordingTimers();
    mediaRecorder.current.stop();
  }

  return {
    audioStatus,
    audioError,
    recordingSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudioError: () => setAudioError(null),
  };
}
