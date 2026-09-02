"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { generateExploreResponse } from "@/lib/explore";
import { exploreMessageSchema, titleFromExploreMessage } from "@/lib/explore-contract";
import { LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/life-areas";

export type ExploreMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ExploreActionResult =
  | { ok: true; conversationId: string; userMessage: ExploreMessage; assistantMessage: ExploreMessage }
  | { ok: false; error: "message"; conversationId?: undefined; userMessage?: undefined }
  | { ok: false; error: "generation"; conversationId: string; userMessage: ExploreMessage };

function serializeMessage(message: { id: string; role: "user" | "assistant"; content: string; createdAt: Date }): ExploreMessage {
  return { ...message, createdAt: message.createdAt.toISOString() };
}

async function generateReply(userId: string, locale: Locale, conversationId: string, userMessage: { id: string; content: string; createdAt: Date }) {
  const [intent, natalChart, recentMessages] = await Promise.all([
    db.initialIntent.findUnique({ where: { userId } }),
    db.natalChart.findUnique({ where: { userId } }),
    db.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 25,
    }),
  ]);

  if (!intent?.discoveryCompletedAt || !natalChart) throw new Error("Completed onboarding context is unavailable");
  const messages = getDictionary(locale);
  const lifeAreas = intent.lifeAreas.flatMap((value) => {
    const key = z.enum(LIFE_AREA_KEYS).safeParse(value);
    return key.success ? [messages.initialIntent.areas[key.data as LifeAreaKey]] : [];
  });
  const thread = recentMessages
    .reverse()
    .filter((message) => message.id !== userMessage.id)
    .map((message) => ({ role: message.role, content: message.content }));

  const generated = await generateExploreResponse({
    locale,
    lifeAreas,
    currentContext: intent.currentContext,
    initialQuestions: intent.discoveryQuestions,
    initialAnswers: intent.initialAnswers,
    finalQuestions: intent.finalQuestions,
    finalAnswers: intent.finalAnswers,
    natalChart: natalChart.data,
    thread,
    latestMessage: userMessage.content,
  });

  const assistantMessage = await db.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: generated.reply,
      internalSignals: generated.signals,
      model: generated.model,
      responseId: generated.responseId,
      inReplyToId: userMessage.id,
    },
  });
  await db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: assistantMessage.createdAt } });
  return assistantMessage;
}

export async function sendExploreMessage(locale: Locale, conversationId: string | null, content: string): Promise<ExploreActionResult> {
  if (!isLocale(locale)) return { ok: false, error: "message" };
  const parsed = exploreMessageSchema.safeParse(content);
  if (!parsed.success) return { ok: false, error: "message" };

  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  if (!intent?.discoveryCompletedAt) return { ok: false, error: "message" };

  let activeConversationId = conversationId;
  let userMessage;

  if (activeConversationId) {
    const conversation = await db.conversation.findFirst({ where: { id: activeConversationId, userId: user.id, status: "active" } });
    if (!conversation) return { ok: false, error: "message" };
    userMessage = await db.message.create({ data: { conversationId: activeConversationId, role: "user", content: parsed.data } });
    await db.conversation.update({ where: { id: activeConversationId }, data: { lastMessageAt: userMessage.createdAt } });
  } else {
    const conversation = await db.conversation.create({
      data: {
        userId: user.id,
        mode: "EXPLORE",
        title: titleFromExploreMessage(parsed.data),
        messages: { create: { role: "user", content: parsed.data } },
      },
      include: { messages: true },
    });
    activeConversationId = conversation.id;
    userMessage = conversation.messages[0];
  }

  try {
    const assistantMessage = await generateReply(user.id, locale, activeConversationId, userMessage);
    return { ok: true, conversationId: activeConversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(assistantMessage) };
  } catch (error) {
    console.error("EXPLORE response generation failed", error);
    return { ok: false, error: "generation", conversationId: activeConversationId, userMessage: serializeMessage(userMessage) };
  }
}

export async function retryExploreResponse(locale: Locale, conversationId: string, userMessageId: string): Promise<ExploreActionResult> {
  if (!isLocale(locale)) return { ok: false, error: "message" };
  const user = await requireCurrentUser(locale);
  const userMessage = await db.message.findFirst({
    where: { id: userMessageId, role: "user", conversation: { id: conversationId, userId: user.id, status: "active" } },
  });
  if (!userMessage) return { ok: false, error: "message" };

  const existingReply = await db.message.findUnique({ where: { inReplyToId: userMessage.id } });
  if (existingReply) {
    return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(existingReply) };
  }

  try {
    const assistantMessage = await generateReply(user.id, locale, conversationId, userMessage);
    return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(assistantMessage) };
  } catch (error) {
    console.error("EXPLORE response retry failed", error);
    return { ok: false, error: "generation", conversationId, userMessage: serializeMessage(userMessage) };
  }
}
