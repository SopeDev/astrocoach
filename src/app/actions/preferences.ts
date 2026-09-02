"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";

const themeSchema = z.enum(["system", "light", "dark"]);

export async function persistThemePreference(value: string) {
  const theme = themeSchema.safeParse(value);
  const session = await auth();

  if (!theme.success || !session?.user?.id) return { ok: false as const };

  try {
    await db.user.update({ where: { id: session.user.id }, data: { theme: theme.data } });
    return { ok: true as const };
  } catch (error) {
    console.error("Saving theme preference failed", error);
    return { ok: false as const };
  }
}
