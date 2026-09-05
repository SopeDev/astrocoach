"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { conversationIdSchema, serializeConversationExport } from "@/lib/conversations";

function revalidateConversationLists(locale: Locale) {
  revalidatePath(`/${locale}/conversations`);
  revalidatePath(`/${locale}/home`);
  revalidatePath(`/${locale}/map`);
}

export async function archiveConversation(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = conversationIdSchema.safeParse(conversationId);
  if (!parsedId.success) return { ok: false as const };

  const user = await requireCurrentUser(locale);
  const archivedAt = new Date();
  const result = await db.conversation.updateMany({
    where: { id: parsedId.data, userId: user.id, archivedAt: null },
    data: { archivedAt },
  });
  if (result.count !== 1) return { ok: false as const };

  revalidateConversationLists(locale);
  return { ok: true as const, archivedAt: archivedAt.toISOString() };
}

export async function restoreConversation(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = conversationIdSchema.safeParse(conversationId);
  if (!parsedId.success) return { ok: false as const };

  const user = await requireCurrentUser(locale);
  const result = await db.conversation.updateMany({
    where: { id: parsedId.data, userId: user.id, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  if (result.count !== 1) return { ok: false as const };

  revalidateConversationLists(locale);
  return { ok: true as const };
}

export async function deleteArchivedConversation(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = conversationIdSchema.safeParse(conversationId);
  if (!parsedId.success) return { ok: false as const };

  const user = await requireCurrentUser(locale);
  const result = await db.$transaction(async (transaction) => {
    const conversation = await transaction.conversation.findFirst({
      where: { id: parsedId.data, userId: user.id, archivedAt: { not: null } },
      select: { id: true },
    });
    if (!conversation) return null;

    const deletedPatterns = await transaction.pattern.deleteMany({ where: { conversationId: conversation.id, userId: user.id } });
    const deletedConversation = await transaction.conversation.deleteMany({ where: { id: conversation.id, userId: user.id, archivedAt: { not: null } } });
    if (deletedConversation.count !== 1) throw new Error("Archived conversation changed before deletion");
    return { deletedPatterns: deletedPatterns.count };
  });
  if (!result) return { ok: false as const };

  revalidateConversationLists(locale);
  return { ok: true as const, deletedPatterns: result.deletedPatterns };
}

export async function exportConversation(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = conversationIdSchema.safeParse(conversationId);
  if (!parsedId.success) return { ok: false as const };

  const user = await requireCurrentUser(locale);
  const conversation = await db.conversation.findFirst({
    where: { id: parsedId.data, userId: user.id },
    include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  if (!conversation) return { ok: false as const };

  return {
    ok: true as const,
    title: conversation.title,
    data: serializeConversationExport(conversation),
  };
}
