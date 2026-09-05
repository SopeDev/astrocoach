import Link from "next/link";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function InsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  await requireCurrentUser(locale);
  const messages = getDictionary(locale);

  return <main><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[var(--explore)] dark:text-slate-300" href={`/${locale}/map`}><ArrowLeft aria-hidden="true" className="size-4" />{messages.map.backToMap}</Link><div className="mt-9 border-y border-[var(--line)] py-12 text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--natal-soft)] text-[var(--natal)]"><Lightbulb aria-hidden="true" className="size-6" /></span><h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.map.insightsTitle}</h1><p className="mx-auto mt-3 max-w-md leading-7 text-slate-600 dark:text-slate-300">{messages.map.insightsEmpty}</p></div></main>;
}
