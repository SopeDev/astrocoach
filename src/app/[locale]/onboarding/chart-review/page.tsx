import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function HiddenChartReviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) redirect("/");

  await requireCurrentUser(locale);
  redirect(`/${locale}/onboarding/intent`);
}
