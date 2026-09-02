"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

const syncedUserKey = "astrocoach-theme-user";

export function ThemePreferenceSync({ preference, userId }: { preference: "system" | "light" | "dark"; userId: string }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (window.localStorage.getItem(syncedUserKey) === userId) return;
    setTheme(preference);
    window.localStorage.setItem(syncedUserKey, userId);
  }, [preference, setTheme, userId]);

  return null;
}
