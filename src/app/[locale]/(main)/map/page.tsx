import { MapHub } from "@/components/map-hub";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const messages = getDictionary(locale);
  const patternCount = await db.pattern.count({
    where: { userId: user.id, archivedAt: null },
  });

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.map.title}</h1>
      <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{messages.map.description}</p>
      <MapHub locale={locale} messages={messages.map} patternCount={patternCount} />
    </main>
  );
}
