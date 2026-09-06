import { notFound, redirect } from "next/navigation";
import { ExploreChat } from "@/components/explore-chat";
import { ThemePreferenceSync } from "@/components/theme-preference-sync";
import { db } from "@/db/client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { practiceProposalOffer } from "@/lib/integrate-contract";
import { candidateEvaluationOffer, recognizedMapItemOffer } from "@/lib/recognize-contract";

export default async function ConversationPage({ params }: { params: Promise<{ locale: string; conversationId: string }> }) {
  const { locale, conversationId } = await params;
  if (!isLocale(locale)) return null;
  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  if (!intent?.discoveryCompletedAt) redirect(`/${locale}/onboarding/discovery`);
  if (!intent.orientationCompletedAt) redirect(`/${locale}/onboarding/orientation`);

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId: user.id },
    include: {
      messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      sourceMapItems: true,
      practices: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!conversation) notFound();

  const messages = getDictionary(locale);
  const lastMessage = conversation.messages.at(-1);
  const interactive = !conversation.archivedAt;
  const evaluationOffer = interactive && lastMessage?.role === "assistant" ? candidateEvaluationOffer(lastMessage.id, lastMessage.internalSignals) : null;
  const recognizedItem = lastMessage?.role === "assistant" ? recognizedMapItemOffer(lastMessage.internalSignals) : null;
  const savedItem = lastMessage ? conversation.sourceMapItems.find((item) => item.sourceMessageId === lastMessage.id) : null;
  const mapItemSaveOffer = recognizedItem && lastMessage && (interactive || savedItem) ? { messageId: lastMessage.id, ...recognizedItem, ...(savedItem ? { mapItemId: savedItem.id } : {}) } : null;
  const practiceOffer = interactive && lastMessage?.role === "assistant" ? practiceProposalOffer(lastMessage.id, lastMessage.internalSignals) : null;
  const activePractice = conversation.practices[0];
  const profileInitial = (user.name?.trim()[0] ?? user.email?.trim()[0] ?? "A").toUpperCase();
  return <><ThemePreferenceSync preference={user.theme} userId={user.id} /><ExploreChat initialActivePractice={activePractice ? { id: activePractice.id, intention: activePractice.intention, purpose: activePractice.purpose, primitive: activePractice.primitive, instruction: activePractice.instruction, cue: activePractice.cue } : null} initialCandidateEvaluationOffer={evaluationOffer} initialClosed={!interactive || conversation.status !== "active"} initialConversationId={conversation.id} initialFailedMessageId={interactive && conversation.status === "active" && lastMessage?.role === "user" ? lastMessage.id : null} initialMapItemSaveOffer={mapItemSaveOffer} initialMessages={conversation.messages.map((message) => ({ id: message.id, role: message.role, mode: message.mode, content: message.content, createdAt: message.createdAt.toISOString() }))} initialMode={conversation.mode} initialPracticeProposalOffer={practiceOffer} initialTransitionOffered={interactive && conversation.transitionState === "OFFERED"} locale={locale} messages={messages.explore} profileInitial={profileInitial} /></>;
}
