import { notFound, redirect } from "next/navigation";
import { ExploreChat } from "@/components/explore-chat";
import { ThemePreferenceSync } from "@/components/theme-preference-sync";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { candidateEvaluationOffer, recognizedPatternOffer } from "@/lib/recognize-contract";

export default async function ConversationPage({ params }: { params: Promise<{ locale: string; conversationId: string }> }) {
  const { locale, conversationId } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  if (!intent?.discoveryCompletedAt) redirect(`/${locale}/onboarding/discovery`);
  if (!intent.orientationCompletedAt) redirect(`/${locale}/onboarding/orientation`);

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId: user.id },
    include: { messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  if (!conversation) notFound();

  const messages = getDictionary(locale);
  const lastMessage = conversation.messages.at(-1);
  const interactive = !conversation.archivedAt;
  const evaluationOffer = interactive && lastMessage?.role === "assistant" ? candidateEvaluationOffer(lastMessage.id, lastMessage.internalSignals) : null;
  const patternStatement = interactive && lastMessage?.role === "assistant" ? recognizedPatternOffer(lastMessage.internalSignals) : null;
  const patternSaveOffer = patternStatement && lastMessage ? { messageId: lastMessage.id, statement: patternStatement } : null;
  const profileInitial = (user.name?.trim()[0] ?? user.email?.trim()[0] ?? "A").toUpperCase();
  return <><ThemePreferenceSync preference={user.theme} userId={user.id} /><ExploreChat initialCandidateEvaluationOffer={evaluationOffer} initialClosed={!interactive || conversation.status !== "active"} initialConversationId={conversation.id} initialFailedMessageId={interactive && conversation.status === "active" && lastMessage?.role === "user" ? lastMessage.id : null} initialMessages={conversation.messages.map((message) => ({ id: message.id, role: message.role, mode: message.mode, content: message.content, createdAt: message.createdAt.toISOString() }))} initialMode={conversation.mode} initialPatternSaveOffer={patternSaveOffer} initialTransitionOffered={interactive && conversation.transitionState === "OFFERED"} locale={locale} messages={messages.explore} profileInitial={profileInitial} /></>;
}
