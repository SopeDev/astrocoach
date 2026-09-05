import { z } from "zod";

export const conversationIdSchema = z.string().uuid();

type ExportableConversation = {
  id: string;
  title: string | null;
  mode: string;
  status: string;
  transitionState: string;
  transitionReferenceAt: Date | null;
  lastMessageAt: Date;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    mode: string;
    content: string;
    internalSignals: unknown;
    model: string | null;
    responseId: string | null;
    inReplyToId: string | null;
    createdAt: Date;
  }>;
};

export function serializeConversationExport(conversation: ExportableConversation, exportedAt = new Date()) {
  return {
    format: "astrocoach-conversation",
    version: 1,
    exportedAt: exportedAt.toISOString(),
    conversation: {
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
      status: conversation.status,
      transitionState: conversation.transitionState,
      transitionReferenceAt: conversation.transitionReferenceAt?.toISOString() ?? null,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      archivedAt: conversation.archivedAt?.toISOString() ?? null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        mode: message.mode,
        content: message.content,
        internalSignals: message.internalSignals,
        model: message.model,
        responseId: message.responseId,
        inReplyToId: message.inReplyToId,
        createdAt: message.createdAt.toISOString(),
      })),
    },
  };
}
