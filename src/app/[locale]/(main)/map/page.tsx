import { Map } from "lucide-react";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const messages = getDictionary(locale);
  return <main><h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.map.title}</h1><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{messages.map.description}</p><div className="mt-10 rounded-3xl border border-dashed border-slate-300 p-7 text-center dark:border-slate-700"><Map aria-hidden="true" className="mx-auto size-7 text-violet-600 dark:text-violet-300" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{messages.map.emptyTitle}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.map.emptyDescription}</p></div></main>;
}
