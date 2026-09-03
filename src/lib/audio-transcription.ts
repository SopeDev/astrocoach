export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 120;
export const MAX_TRANSCRIPT_CHARACTERS = 4000;

const MIME_EXTENSIONS: Record<string, string> = {
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
};

const SUPPORTED_EXTENSIONS = new Set(Object.values(MIME_EXTENSIONS));

export function normalizedAudioMimeType(value: string) {
  return value.toLowerCase().split(";", 1)[0].trim();
}

export function audioFileExtension(mimeType: string) {
  return MIME_EXTENSIONS[normalizedAudioMimeType(mimeType)] ?? "webm";
}

export function isSupportedAudioUpload(file: { name: string; type: string }) {
  const mimeType = normalizedAudioMimeType(file.type);
  if (mimeType && MIME_EXTENSIONS[mimeType]) return true;

  const extension = file.name.toLowerCase().split(".").pop();
  return Boolean(extension && SUPPORTED_EXTENSIONS.has(extension));
}
