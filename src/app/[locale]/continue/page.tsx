import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { getUserLandingPath } from "@/lib/user-landing";

export default async function ContinuePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect("/");
  const user = await requireCurrentUser(locale);
  redirect(await getUserLandingPath(locale, user.id));
}
