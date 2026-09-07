export const MAX_USER_MESSAGES_PER_CONVERSATION = 15;
export const MAX_ASSISTANT_MESSAGES_PER_CONVERSATION = 15;
export const MAX_VISIBLE_MESSAGES_PER_CONVERSATION =
  MAX_USER_MESSAGES_PER_CONVERSATION + MAX_ASSISTANT_MESSAGES_PER_CONVERSATION;

export type ConversationMessageCounts = {
  user: number;
  assistant: number;
};

type RoleBearingMessage = { role: "user" | "assistant" };

export function countConversationMessages(
  messages: readonly RoleBearingMessage[],
): ConversationMessageCounts {
  return messages.reduce<ConversationMessageCounts>((counts, message) => {
    counts[message.role] += 1;
    return counts;
  }, { user: 0, assistant: 0 });
}

export function canAddUserMessage(counts: ConversationMessageCounts) {
  return counts.user < MAX_USER_MESSAGES_PER_CONVERSATION
    && counts.assistant < MAX_ASSISTANT_MESSAGES_PER_CONVERSATION;
}

export function canAddAssistantMessage(counts: ConversationMessageCounts) {
  return counts.assistant < MAX_ASSISTANT_MESSAGES_PER_CONVERSATION;
}

export function hasReachedConversationLimit(counts: ConversationMessageCounts) {
  return !canAddUserMessage(counts);
}

export function boundedConversationHistory<T extends RoleBearingMessage>(
  messages: readonly T[],
) {
  const retained: T[] = [];
  const counts: ConversationMessageCounts = { user: 0, assistant: 0 };

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const limit = message.role === "user"
      ? MAX_USER_MESSAGES_PER_CONVERSATION
      : MAX_ASSISTANT_MESSAGES_PER_CONVERSATION;
    if (counts[message.role] >= limit) continue;
    retained.push(message);
    counts[message.role] += 1;
  }

  return retained.reverse();
}

export class ConversationMessageLimitError extends Error {
  constructor() {
    super("Conversation message limit reached");
    this.name = "ConversationMessageLimitError";
  }
}
