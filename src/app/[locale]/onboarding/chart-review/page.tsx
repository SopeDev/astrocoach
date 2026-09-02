import Link from "next/link";
import { ArrowLeft, CircleDot, ClockAlert, Compass, House, MoonStar, Pencil } from "lucide-react";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { natalChartReviewSchema } from "@/lib/natal-chart-review";

const planetNames: Record<Locale, Record<string, string>> = {
  en: {},
  es: { Sun: "Sol", Moon: "Luna", Mercury: "Mercurio", Venus: "Venus", Mars: "Marte", Jupiter: "Júpiter", Saturn: "Saturno", Uranus: "Urano", Neptune: "Neptuno", Pluto: "Plutón", Chiron: "Quirón", "North Node": "Nodo Norte", "South Node": "Nodo Sur" },
};

const signNames: Record<Locale, Record<string, string>> = {
  en: {},
  es: { Aries: "Aries", Taurus: "Tauro", Gemini: "Géminis", Cancer: "Cáncer", Leo: "Leo", Virgo: "Virgo", Libra: "Libra", Scorpio: "Escorpio", Sagittarius: "Sagitario", Capricorn: "Capricornio", Aquarius: "Acuario", Pisces: "Piscis" },
};

function localizeName(locale: Locale, name: string, names: Record<Locale, Record<string, string>>) {
  return names[locale][name] ?? name;
}

function position(locale: Locale, placement: { sign: string; degree: number; minute: number }) {
  return `${placement.degree}° ${String(placement.minute).padStart(2, "0")}′ ${localizeName(locale, placement.sign, signNames)}`;
}

export default async function ChartReviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) return null;

  const messages = getDictionary(locale);
  const user = await requireCurrentUser(locale);
  const [birthProfile, storedChart] = await Promise.all([
    db.birthProfile.findUnique({ where: { userId: user.id } }),
    db.natalChart.findUnique({ where: { userId: user.id } }),
  ]);

  if (!birthProfile?.timezoneId || !storedChart) {
    redirect(`/${locale}/onboarding/birth-location`);
  }

  const parsedChart = natalChartReviewSchema.safeParse(storedChart.data);

  if (!parsedChart.success) {
    throw new Error("Stored natal chart does not match the current chart schema");
  }

  const chart = parsedChart.data;
  const location = [birthProfile.locationName, birthProfile.adminName, birthProfile.countryName].filter(Boolean).join(", ");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(birthProfile.birthDate);
  const time = birthProfile.birthTimeMinutes === null ? messages.chartReview.unknownTime : `${String(Math.floor(birthProfile.birthTimeMinutes / 60)).padStart(2, "0")}:${String(birthProfile.birthTimeMinutes % 60).padStart(2, "0")}`;
  const angles = chart.angles ? Object.values(chart.angles) : [];

  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-20 sm:px-8 sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_32%)]" />
      <div className="absolute left-5 top-5 sm:left-8 sm:top-8"><Link aria-label={messages.chartReview.back} className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900" href={`/${locale}/onboarding/birth-location`}><ArrowLeft aria-hidden="true" className="size-4" /></Link></div>
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8"><ThemeToggle label={messages.themeToggle} /></div>

      <section className="relative mx-auto w-full max-w-2xl">
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border border-violet-200/70 bg-white/70 text-violet-700 shadow-sm backdrop-blur dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200"><MoonStar aria-hidden="true" className="size-5" /></div>
          <p className="mb-3 text-sm font-medium tracking-[0.18em] text-violet-700 uppercase dark:text-violet-300">{messages.appName}</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">{messages.chartReview.title}</h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty leading-7 text-slate-600 dark:text-slate-300">{messages.chartReview.description}</p>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-7 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300"><p className="font-semibold text-slate-950 dark:text-white">{date} · {time}</p><p>{location}</p><p className="font-mono text-xs text-slate-500">{birthProfile.timezoneId}</p></div>
            <Link className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" href={`/${locale}/onboarding/birth-data`}><Pencil aria-hidden="true" className="size-4" />{messages.chartReview.edit}</Link>
          </div>

          {chart.uncertainty ? <div className="mt-5 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><ClockAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />{messages.chartReview.unknownTimeNote}</div> : null}

          <div className="mt-8 flex items-center gap-2"><CircleDot aria-hidden="true" className="size-5 text-violet-600 dark:text-violet-300" /><h2 className="text-xl font-semibold text-slate-950 dark:text-white">{messages.chartReview.planets}</h2></div>
          <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {[...chart.planets, ...chart.nodes].map((planet) => <div className="flex min-h-14 items-center justify-between gap-4 bg-white/60 px-4 py-3 dark:bg-slate-950/40" key={planet.name}><div><p className="font-medium text-slate-900 dark:text-white">{localizeName(locale, planet.name, planetNames)}{planet.retrograde ? " ℞" : ""}</p>{planet.house ? <p className="text-xs text-slate-500">{messages.chartReview.house} {planet.house}</p> : null}</div><div className="text-right"><p className="text-sm text-slate-700 dark:text-slate-200">{position(locale, planet)}</p><p className="font-mono text-xs text-slate-400">{planet.longitude.toFixed(4)}°</p></div></div>)}
          </div>

          {angles.length ? <><div className="mt-8 flex items-center gap-2"><Compass aria-hidden="true" className="size-5 text-violet-600 dark:text-violet-300" /><h2 className="text-xl font-semibold text-slate-950 dark:text-white">{messages.chartReview.angles}</h2></div><div className="mt-4 grid grid-cols-2 gap-3">{angles.map((angle) => <div className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/40" key={angle.abbreviation}><p className="font-semibold text-slate-950 dark:text-white">{angle.abbreviation}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{position(locale, angle)}</p><p className="mt-1 font-mono text-xs text-slate-400">{angle.longitude.toFixed(4)}°</p></div>)}</div></> : null}

          {chart.houses ? <details className="mt-8 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-slate-950 dark:text-white"><House aria-hidden="true" className="size-5 text-violet-600 dark:text-violet-300" />{messages.chartReview.houseCusps}</summary><div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">{chart.houses.cusps.map((cusp) => <div className="flex justify-between gap-2 text-sm" key={cusp.house}><span className="text-slate-500">{messages.chartReview.house} {cusp.house}</span><span className="text-right text-slate-800 dark:text-slate-200">{position(locale, cusp)}</span></div>)}</div></details> : null}

          <p className="mt-6 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{messages.chartReview.technical.replace("{engine}", `${storedChart.engine} ${storedChart.engineVersion}`)}</p>
        </div>
      </section>
    </main>
  );
}
