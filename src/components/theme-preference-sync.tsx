"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemePreferenceSync({ preference }: { preference: "system" | "light" | "dark" }) {
  const { setTheme } = useTheme();
  useEffect(() => setTheme(preference), [preference, setTheme]);
  return null;
}
