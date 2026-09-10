export const MAX_PROVIDER_GENERATIONS_PER_EPOCH = 3;
export const PROVIDER_CACHE_IDLE_WINDOW_MS = 30 * 60 * 1000;

export function shouldRotateProviderContext({
  initializedAt,
  lastAssistantAt,
  generationsSinceInitialization,
  now = new Date(),
}: {
  initializedAt: Date | null;
  lastAssistantAt: Date | null;
  generationsSinceInitialization: number;
  now?: Date;
}) {
  if (!initializedAt) return true;
  if (generationsSinceInitialization >= MAX_PROVIDER_GENERATIONS_PER_EPOCH) return true;
  return Boolean(
    lastAssistantAt &&
    lastAssistantAt >= initializedAt &&
    now.getTime() - lastAssistantAt.getTime() >= PROVIDER_CACHE_IDLE_WINDOW_MS,
  );
}

export function chatPromptCacheKey(appConversationId: string) {
  return `astrocoach:${appConversationId}`.slice(0, 64);
}
