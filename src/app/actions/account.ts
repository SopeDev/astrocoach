"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { deleteProviderConversation } from "@/lib/openai-conversation-state";

export async function resetAccount(locale: Locale) {
  if (!isLocale(locale)) redirect("/");

  const user = await requireCurrentUser(locale);
  const providerConversationIds = await db.$transaction(async (transaction) => {
    const conversations = await transaction.conversation.findMany({
      where: { userId: user.id, providerConversationId: { not: null } },
      select: { providerConversationId: true },
    });

    // Keep the User, OAuth Account, and Session records so the user stays signed in.
    // Product data is removed explicitly to make the reset boundary easy to audit.
    await transaction.practiceObservation.deleteMany({ where: { userId: user.id } });
    await transaction.practice.deleteMany({ where: { userId: user.id } });
    await transaction.mapItem.deleteMany({ where: { userId: user.id } });
    await transaction.conversation.deleteMany({ where: { userId: user.id } });
    await transaction.initialIntent.deleteMany({ where: { userId: user.id } });
    await transaction.natalInterpretation.deleteMany({ where: { userId: user.id } });
    await transaction.natalChart.deleteMany({ where: { userId: user.id } });
    await transaction.birthProfile.deleteMany({ where: { userId: user.id } });

    return conversations.flatMap(({ providerConversationId }) =>
      providerConversationId ? [providerConversationId] : [],
    );
  });

  await Promise.allSettled(
    providerConversationIds.map(async (providerConversationId) => {
      try {
        await deleteProviderConversation(providerConversationId);
      } catch (error) {
        console.error("Reset local account data but could not delete provider conversation state", error);
      }
    }),
  );

  redirect(`/${locale}/onboarding/birth-data`);
}
