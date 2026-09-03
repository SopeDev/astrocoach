import assert from "node:assert/strict";
import test from "node:test";
import {
  audioFileExtension,
  isSupportedAudioUpload,
  MAX_AUDIO_BYTES,
  MAX_RECORDING_SECONDS,
  MAX_TRANSCRIPT_CHARACTERS,
  normalizedAudioMimeType,
} from "./audio-transcription";

test("audio upload validation accepts supported browser recording formats", () => {
  assert.equal(isSupportedAudioUpload({ name: "recording.webm", type: "audio/webm;codecs=opus" }), true);
  assert.equal(isSupportedAudioUpload({ name: "recording.m4a", type: "audio/mp4" }), true);
  assert.equal(isSupportedAudioUpload({ name: "recording.ogg", type: "" }), true);
  assert.equal(isSupportedAudioUpload({ name: "recording.txt", type: "text/plain" }), false);
});

test("audio helpers normalize MIME metadata and preserve conservative limits", () => {
  assert.equal(normalizedAudioMimeType("Audio/WebM; codecs=opus"), "audio/webm");
  assert.equal(audioFileExtension("audio/mp4;codecs=mp4a.40.2"), "m4a");
  assert.equal(MAX_AUDIO_BYTES, 4 * 1024 * 1024);
  assert.equal(MAX_RECORDING_SECONDS, 120);
  assert.equal(MAX_TRANSCRIPT_CHARACTERS, 4000);
});
