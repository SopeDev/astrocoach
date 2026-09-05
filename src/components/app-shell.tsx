"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, MessagesSquare } from "lucide-react";
import type { Locale } from "@/i18n/config";

type ShellMessages = {
  home: string;
  conversations: string;
  map: string;
  account: string;
};

export function AppShell({ children, locale, profileInitial, messages }: {
  children: ReactNode;
  locale: Locale;
  profileInitial: string;
  messages: ShellMessages;
}) {
  const pathname = usePathname();
  const navigation = [
    { href: `/${locale}/home`, label: messages.home, icon: Home },
    { href: `/${locale}/conversations`, label: messages.conversations, icon: MessagesSquare },
    { href: `/${locale}/map`, label: messages.map, icon: Map },
  ];

  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[color:var(--background)]/90 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:border-slate-800/80">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
          <Link className="text-base font-semibold tracking-tight text-slate-950 dark:text-white" href={`/${locale}/home`}>AstroCoach</Link>
          <Link aria-label={messages.account} className={`${pathname === `/${locale}/account` ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-[var(--background)]" : ""} flex size-10 cursor-pointer items-center justify-center rounded-full bg-violet-700 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500`} href={`/${locale}/account`}>{profileInitial}</Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-7">{children}</div>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-[color:var(--background)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800/90">
        <div className="mx-auto grid max-w-2xl grid-cols-3">
          {navigation.map(({ href, label, icon: Icon }) => {
            const mapSectionActive = href === `/${locale}/map`
              && (
                pathname === href
                || pathname.startsWith(`/${locale}/map/`)
                || pathname === `/${locale}/chart`
              );
            const active = pathname === href || mapSectionActive;
            return <Link aria-current={active ? "page" : undefined} className={`${active ? "text-violet-700 dark:text-violet-300" : "text-slate-500 dark:text-slate-400"} flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 text-xs font-medium transition hover:text-violet-700 dark:hover:text-violet-300`} href={href} key={href}><Icon aria-hidden="true" className="size-5" /><span>{label}</span></Link>;
          })}
        </div>
      </nav>
    </div>
  );
}
