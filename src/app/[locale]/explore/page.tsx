import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function ExploreIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect("/");
  const user = await requireCurrentUser(locale);
  const latest = await db.conversation.findFirst({ where: { userId: user.id }, orderBy: { lastMessageAt: "desc" } });
  redirect(latest ? `/${locale}/explore/${latest.id}` : `/${locale}/home`);
}
