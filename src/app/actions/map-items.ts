"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { mapItemIdSchema, mapItemKindSchema, mapItemStatementSchema } from "@/lib/map-items";

function revalidateMapItemViews(locale: Locale, mapItemId?: string) {
  revalidatePath(`/${locale}/map`);
  revalidatePath(`/${locale}/map/patterns`);
  revalidatePath(`/${locale}/map/insights`);
  revalidatePath(`/${locale}/map/practices`);
  if (mapItemId) revalidatePath(`/${locale}/map/${mapItemId}`);
}

export async function updateMapItem(locale: Locale, mapItemId: string, statement: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "invalid" as const };
  const parsedId = mapItemIdSchema.safeParse(mapItemId);
  const parsedStatement = mapItemStatementSchema.safeParse(statement);
  if (!parsedId.success || !parsedStatement.success) return { ok: false as const, error: "invalid" as const };

  const user = await requireCurrentUser(locale);
  const result = await db.mapItem.updateMany({
    where: { id: parsedId.data, userId: user.id, archivedAt: null },
    data: { statement: parsedStatement.data },
  });
  if (result.count !== 1) return { ok: false as const, error: "missing" as const };

  revalidateMapItemViews(locale, parsedId.data);
  return { ok: true as const, statement: parsedStatement.data };
}

export async function archiveMapItem(locale: Locale, mapItemId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = mapItemIdSchema.safeParse(mapItemId);
  if (!parsedId.success) return { ok: false as const };

  const user = await requireCurrentUser(locale);
  const archivedAt = new Date();
  const result = await db.$transaction(async (transaction) => {
    const archived = await transaction.mapItem.updateMany({
      where: { id: parsedId.data, userId: user.id, archivedAt: null },
      data: { archivedAt },
    });
    if (archived.count === 1) {
      await transaction.practice.updateMany({
        where: { mapItemId: parsedId.data, userId: user.id, status: { in: ["ACTIVE", "PAUSED"] } },
        data: { status: "ARCHIVED" },
      });
      await transaction.conversation.updateMany({
        where: { focalMapItemId: parsedId.data, userId: user.id, status: "active" },
        data: { status: "closed", transitionState: "IDLE" },
      });
    }
    return archived;
  });
  if (result.count !== 1) return { ok: false as const };

  revalidateMapItemViews(locale, parsedId.data);
  return { ok: true as const, archivedAt: archivedAt.toISOString() };
}

export async function restoreMapItem(locale: Locale, mapItemId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = mapItemIdSchema.safeParse(mapItemId);
  if (!parsedId.success) return { ok: false as const };

  const user = await requireCurrentUser(locale);
  const result = await db.mapItem.updateMany({
    where: { id: parsedId.data, userId: user.id, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  if (result.count !== 1) return { ok: false as const };

  revalidateMapItemViews(locale, parsedId.data);
  return { ok: true as const };
}

export async function getMapItem(locale: Locale, mapItemId: string, expectedKind?: string) {
  if (!isLocale(locale)) return null;
  const parsedId = mapItemIdSchema.safeParse(mapItemId);
  const parsedKind = expectedKind ? mapItemKindSchema.safeParse(expectedKind) : null;
  if (!parsedId.success || (parsedKind && !parsedKind.success)) return null;
  const user = await requireCurrentUser(locale);
  return db.mapItem.findFirst({
    where: { id: parsedId.data, userId: user.id, ...(parsedKind?.success ? { kind: parsedKind.data } : {}) },
  });
}
