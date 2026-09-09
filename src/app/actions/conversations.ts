"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { conversationIdSchema, serializeConversationExport } from "@/lib/conversations";
import { deleteProviderConversation } from "@/lib/openai-conversation-state";

function revalidateConversationLists(locale: Locale) {
  revalidatePath(`/${locale}/conversations`);
  revalidatePath(`/${locale}/home`);
  revalidatePath(`/${locale}/map`);
  revalidatePath(`/${locale}/map/patterns`);
  revalidatePath(`/${locale}/map/insights`);
  revalidatePath(`/${locale}/map/practices`);
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
      select: { id: true, providerConversationId: true },
    });
    if (!conversation) return null;

    const rootedMapItems = await transaction.mapItem.findMany({ where: { conversationId: conversation.id, userId: user.id }, select: { id: true } });
    if (rootedMapItems.length) {
      await transaction.conversation.updateMany({
        where: { userId: user.id, focalMapItemId: { in: rootedMapItems.map((item) => item.id) }, status: "active" },
        data: { status: "closed", transitionState: "IDLE" },
      });
    }
    const deletedMapItems = await transaction.mapItem.deleteMany({ where: { id: { in: rootedMapItems.map((item) => item.id) }, userId: user.id } });
    const deletedConversation = await transaction.conversation.deleteMany({ where: { id: conversation.id, userId: user.id, archivedAt: { not: null } } });
    if (deletedConversation.count !== 1) throw new Error("Archived conversation changed before deletion");
    return {
      deletedMapItems: deletedMapItems.count,
      providerConversationId: conversation.providerConversationId,
    };
  });
  if (!result) return { ok: false as const };

  if (result.providerConversationId) {
    try {
      await deleteProviderConversation(result.providerConversationId);
    } catch (error) {
      console.error("Deleted the local conversation but could not delete its provider state", error);
    }
  }

  revalidateConversationLists(locale);
  return { ok: true as const, deletedMapItems: result.deletedMapItems };
}

export async function exportConversation(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = conversationIdSchema.safeParse(conversationId);
  if (!parsedId.success) return { ok: false as const };

  const user = await requireCurrentUser(locale);
  const conversation = await db.conversation.findFirst({
    where: { id: parsedId.data, userId: user.id },
    include: {
      messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      generationUsages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
  if (!conversation) return { ok: false as const };

  return {
    ok: true as const,
    title: conversation.title,
    data: serializeConversationExport(conversation),
  };
}
