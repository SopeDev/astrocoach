import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { MapItemDetail } from "@/components/map-item-detail";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { mapItemIdSchema } from "@/lib/map-items";

export default async function MapItemPage({ params }: { params: Promise<{ locale: string; mapItemId: string }> }) {
  const { locale, mapItemId } = await params;
  if (!isLocale(locale)) return null;
  const parsedId = mapItemIdSchema.safeParse(mapItemId);
  if (!parsedId.success) notFound();
  const user = await requireCurrentUser(locale);
  const item = await db.mapItem.findFirst({
    where: { id: parsedId.data, userId: user.id },
    include: { practices: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!item) notFound();
  const messages = getDictionary(locale);
  const activePractice = item.practices[0];
  return <main><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[var(--explore)] dark:text-slate-300" href={`/${locale}/map/${item.kind === "PATTERN" ? "patterns" : "insights"}`}><ArrowLeft aria-hidden="true" className="size-4" />{messages.map.backToItems}</Link><MapItemDetail activePractice={activePractice ? { id: activePractice.id, conversationId: activePractice.conversationId, instruction: activePractice.instruction, cue: activePractice.cue } : null} item={{ id: item.id, kind: item.kind, statement: item.statement, archived: Boolean(item.archivedAt) }} locale={locale} messages={messages.map} /></main>;
}
