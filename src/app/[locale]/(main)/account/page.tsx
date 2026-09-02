import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { ThemeSettings } from "@/components/theme-settings";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const messages = getDictionary(locale);
  async function logOut() { "use server"; await signOut({ redirectTo: "/" }); }

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{messages.account.title}</h1>
      <div className="mt-7 rounded-2xl border border-slate-200/80 bg-white/75 p-5 dark:border-slate-800 dark:bg-slate-950/55"><p className="font-medium text-slate-950 dark:text-white">{user.name ?? messages.account.defaultName}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</p></div>
      <section className="mt-8"><h2 className="font-semibold text-slate-950 dark:text-white">{messages.account.appearance}</h2><p className="mb-4 mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{messages.account.appearanceDescription}</p><ThemeSettings initialPreference={user.theme} labels={messages.account.themes} /></section>
      <form action={logOut} className="mt-10"><button className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900" type="submit"><LogOut aria-hidden="true" className="size-4" />{messages.account.signOut}</button></form>
    </main>
  );
}
