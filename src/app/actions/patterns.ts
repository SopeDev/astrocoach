"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { patternIdSchema, patternStatementSchema } from "@/lib/patterns";

export async function updatePattern(locale: Locale, patternId: string, statement: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "invalid" as const };
  const parsedId = patternIdSchema.safeParse(patternId);
  const parsedStatement = patternStatementSchema.safeParse(statement);
  if (!parsedId.success || !parsedStatement.success) return { ok: false as const, error: "invalid" as const };

  const user = await requireCurrentUser(locale);
  const result = await db.pattern.updateMany({
    where: { id: parsedId.data, userId: user.id, archivedAt: null },
    data: { statement: parsedStatement.data },
  });
  if (result.count !== 1) return { ok: false as const, error: "missing" as const };

  revalidatePath(`/${locale}/map`);
  return { ok: true as const, statement: parsedStatement.data };
}

export async function archivePattern(locale: Locale, patternId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = patternIdSchema.safeParse(patternId);
  if (!parsedId.success) return { ok: false as const };

  const user = await requireCurrentUser(locale);
  const archivedAt = new Date();
  const result = await db.pattern.updateMany({
    where: { id: parsedId.data, userId: user.id, archivedAt: null },
    data: { archivedAt },
  });
  if (result.count !== 1) return { ok: false as const };

  revalidatePath(`/${locale}/map`);
  return { ok: true as const, archivedAt: archivedAt.toISOString() };
}

export async function restorePattern(locale: Locale, patternId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedId = patternIdSchema.safeParse(patternId);
  if (!parsedId.success) return { ok: false as const };

  const user = await requireCurrentUser(locale);
  const result = await db.pattern.updateMany({
    where: { id: parsedId.data, userId: user.id, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  if (result.count !== 1) return { ok: false as const };

  revalidatePath(`/${locale}/map`);
  return { ok: true as const };
}
