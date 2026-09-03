import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isLocale } from "@/i18n/config";
import { isSupportedAudioUpload, MAX_AUDIO_BYTES, MAX_TRANSCRIPT_CHARACTERS } from "@/lib/audio-transcription";
import { getServerEnv } from "@/lib/env";

export const runtime = "nodejs";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await auth())?.user?.id) return json({ error: "unauthorized" }, 401);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 256 * 1024) {
    return json({ error: "too_large" }, 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "invalid_audio" }, 400);
  }

  const audio = formData.get("audio");
  const locale = formData.get("locale");
  if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES || !isSupportedAudioUpload(audio) || typeof locale !== "string" || !isLocale(locale)) {
    return json({ error: audio instanceof File && audio.size > MAX_AUDIO_BYTES ? "too_large" : "invalid_audio" }, audio instanceof File && audio.size > MAX_AUDIO_BYTES ? 413 : 400);
  }

  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) return json({ error: "unavailable" }, 503);

  try {
    const transcription = await new OpenAI({ apiKey: env.OPENAI_API_KEY }).audio.transcriptions.create({
      file: audio,
      model: env.OPENAI_TRANSCRIBE_MODEL,
      language: locale,
    });
    const text = transcription.text.trim();

    if (!text) return json({ error: "no_speech" }, 422);
    if (text.length > MAX_TRANSCRIPT_CHARACTERS) return json({ error: "transcript_too_long" }, 413);
    return json({ text });
  } catch (error) {
    console.error("Audio transcription failed", error instanceof Error ? error.message : error);
    return json({ error: "unavailable" }, 503);
  }
}
