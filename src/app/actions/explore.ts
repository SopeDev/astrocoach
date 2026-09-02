"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { generateExploreResponse } from "@/lib/explore";
import { exploreMessageSchema, titleFromExploreMessage } from "@/lib/explore-contract";
import { LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/life-areas";
import { shouldOfferRecognition } from "@/lib/mode-orchestration";
import { generateRecognizeResponse } from "@/lib/recognize";
import { recognizedPatternOffer } from "@/lib/recognize-contract";

export type ConversationMode = "EXPLORE" | "RECOGNIZE";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  mode: ConversationMode;
  content: string;
  createdAt: string;
};

export type PatternSaveOffer = { messageId: string; statement: string };

export type ConversationActionResult =
  | { ok: true; conversationId: string; userMessage?: ConversationMessage; assistantMessage: ConversationMessage; mode: ConversationMode; transitionOffered: boolean; patternSaveOffer: PatternSaveOffer | null }
  | { ok: false; error: "message"; conversationId?: undefined; userMessage?: undefined }
  | { ok: false; error: "generation"; conversationId: string; userMessage?: ConversationMessage };

type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  mode: ConversationMode;
  content: string;
  createdAt: Date;
  internalSignals?: unknown;
};

function serializeMessage(message: StoredMessage): ConversationMessage {
  return { id: message.id, role: message.role, mode: message.mode, content: message.content, createdAt: message.createdAt.toISOString() };
}

function patternOfferFromMessage(message: { id: string; internalSignals: unknown }) {
  const statement = recognizedPatternOffer(message.internalSignals);
  return statement ? { messageId: message.id, statement } : null;
}

async function loadGenerationContext(userId: string, locale: Locale, conversationId: string, excludedMessageId?: string) {
  const [intent, natalChart, conversation, recentMessages] = await Promise.all([
    db.initialIntent.findUnique({ where: { userId } }),
    db.natalChart.findUnique({ where: { userId } }),
    db.conversation.findFirst({ where: { id: conversationId, userId } }),
    db.message.findMany({ where: { conversationId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 25 }),
  ]);

  if (!intent?.discoveryCompletedAt || !natalChart || !conversation) throw new Error("Completed conversation context is unavailable");
  const messages = getDictionary(locale);
  const lifeAreas = intent.lifeAreas.flatMap((value) => {
    const key = z.enum(LIFE_AREA_KEYS).safeParse(value);
    return key.success ? [messages.initialIntent.areas[key.data as LifeAreaKey]] : [];
  });
  const thread = recentMessages.reverse().filter((message) => message.id !== excludedMessageId).map((message) => ({ role: message.role, content: message.content }));
  return { intent, natalChart, conversation, thread, lifeAreas };
}

async function generateReply(userId: string, locale: Locale, conversationId: string, userMessage: StoredMessage) {
  const context = await loadGenerationContext(userId, locale, conversationId, userMessage.id);
  const generated = context.conversation.mode === "RECOGNIZE"
    ? await generateRecognizeResponse({ locale, lifeAreas: context.lifeAreas, currentContext: context.intent.currentContext, initialQuestions: context.intent.discoveryQuestions, initialAnswers: context.intent.initialAnswers, finalQuestions: context.intent.finalQuestions, finalAnswers: context.intent.finalAnswers, thread: context.thread, latestMessage: userMessage.content, opening: false })
    : await generateExploreResponse({ locale, lifeAreas: context.lifeAreas, currentContext: context.intent.currentContext, initialQuestions: context.intent.discoveryQuestions, initialAnswers: context.intent.initialAnswers, finalQuestions: context.intent.finalQuestions, finalAnswers: context.intent.finalAnswers, natalChart: context.natalChart.data, thread: context.thread, latestMessage: userMessage.content });

  const assistantMessage = await db.message.create({
    data: { conversationId, role: "assistant", mode: context.conversation.mode, content: generated.reply, internalSignals: generated.signals, model: generated.model, responseId: generated.responseId, inReplyToId: userMessage.id },
  });

  let mode: ConversationMode = context.conversation.mode;
  let transitionOffered = context.conversation.transitionState === "OFFERED";

  if (mode === "EXPLORE" && !transitionOffered) {
    const recentSignals = await db.message.findMany({ where: { conversationId, role: "assistant", mode: "EXPLORE" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 3, select: { createdAt: true, internalSignals: true } });
    transitionOffered = shouldOfferRecognition(recentSignals.reverse(), context.conversation.transitionReferenceAt);
  }

  const returningToExplore = mode === "RECOGNIZE" && generated.signals.currentMode === "RECOGNIZE" && generated.signals.userEvaluationStatus === "rejected" && generated.signals.recommendedNextMode === "EXPLORE";
  if (returningToExplore) {
    mode = "EXPLORE";
    transitionOffered = false;
  }

  await db.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: assistantMessage.createdAt,
      mode,
      transitionState: transitionOffered ? "OFFERED" : returningToExplore ? "DISMISSED" : context.conversation.transitionState,
      transitionReferenceAt: returningToExplore ? assistantMessage.createdAt : context.conversation.transitionReferenceAt,
    },
  });

  return { assistantMessage, mode, transitionOffered, patternSaveOffer: mode === "RECOGNIZE" ? patternOfferFromMessage(assistantMessage) : null };
}

export async function sendExploreMessage(locale: Locale, conversationId: string | null, content: string): Promise<ConversationActionResult> {
  if (!isLocale(locale)) return { ok: false, error: "message" };
  const parsed = exploreMessageSchema.safeParse(content);
  if (!parsed.success) return { ok: false, error: "message" };
  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  if (!intent?.discoveryCompletedAt) return { ok: false, error: "message" };

  let activeConversationId = conversationId;
  let userMessage: StoredMessage;
  if (activeConversationId) {
    const conversation = await db.conversation.findFirst({ where: { id: activeConversationId, userId: user.id, status: "active" } });
    if (!conversation) return { ok: false, error: "message" };
    userMessage = await db.message.create({ data: { conversationId: activeConversationId, role: "user", mode: conversation.mode, content: parsed.data } });
    await db.conversation.update({ where: { id: activeConversationId }, data: { lastMessageAt: userMessage.createdAt } });
  } else {
    const conversation = await db.conversation.create({ data: { userId: user.id, mode: "EXPLORE", title: titleFromExploreMessage(parsed.data), messages: { create: { role: "user", mode: "EXPLORE", content: parsed.data } } }, include: { messages: true } });
    activeConversationId = conversation.id;
    userMessage = conversation.messages[0];
  }

  try {
    const result = await generateReply(user.id, locale, activeConversationId, userMessage);
    return { ok: true, conversationId: activeConversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(result.assistantMessage), mode: result.mode, transitionOffered: result.transitionOffered, patternSaveOffer: result.patternSaveOffer };
  } catch (error) {
    console.error("Conversation response generation failed", error);
    return { ok: false, error: "generation", conversationId: activeConversationId, userMessage: serializeMessage(userMessage) };
  }
}

export async function retryExploreResponse(locale: Locale, conversationId: string, userMessageId: string): Promise<ConversationActionResult> {
  if (!isLocale(locale)) return { ok: false, error: "message" };
  const user = await requireCurrentUser(locale);
  const userMessage = await db.message.findFirst({ where: { id: userMessageId, role: "user", conversation: { id: conversationId, userId: user.id, status: "active" } } });
  if (!userMessage) return { ok: false, error: "message" };
  const existingReply = await db.message.findUnique({ where: { inReplyToId: userMessage.id }, include: { conversation: true } });
  if (existingReply) return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(existingReply), mode: existingReply.conversation.mode, transitionOffered: existingReply.conversation.transitionState === "OFFERED", patternSaveOffer: patternOfferFromMessage(existingReply) };

  try {
    const result = await generateReply(user.id, locale, conversationId, userMessage);
    return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(result.assistantMessage), mode: result.mode, transitionOffered: result.transitionOffered, patternSaveOffer: result.patternSaveOffer };
  } catch (error) {
    console.error("Conversation response retry failed", error);
    return { ok: false, error: "generation", conversationId, userMessage: serializeMessage(userMessage) };
  }
}

export async function declineRecognitionTransition(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const latestMessage = await db.message.findFirst({ where: { conversationId, conversation: { userId: user.id } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const result = await db.conversation.updateMany({ where: { id: conversationId, userId: user.id, mode: "EXPLORE", status: "active", transitionState: "OFFERED" }, data: { transitionState: "DISMISSED", transitionReferenceAt: latestMessage?.createdAt ?? new Date() } });
  return { ok: result.count === 1 } as const;
}

export async function acceptRecognitionTransition(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "message" as const };
  const user = await requireCurrentUser(locale);
  const context = await loadGenerationContext(user.id, locale, conversationId);
  if (context.conversation.status !== "active" || context.conversation.mode !== "EXPLORE" || context.conversation.transitionState !== "OFFERED") return { ok: false as const, error: "message" as const };

  try {
    const generated = await generateRecognizeResponse({ locale, lifeAreas: context.lifeAreas, currentContext: context.intent.currentContext, initialQuestions: context.intent.discoveryQuestions, initialAnswers: context.intent.initialAnswers, finalQuestions: context.intent.finalQuestions, finalAnswers: context.intent.finalAnswers, thread: context.thread, latestMessage: null, opening: true });
    const assistantMessage = await db.$transaction(async (transaction) => {
      const updated = await transaction.conversation.updateMany({ where: { id: conversationId, userId: user.id, mode: "EXPLORE", status: "active", transitionState: "OFFERED" }, data: { mode: "RECOGNIZE", transitionState: "IDLE", transitionReferenceAt: new Date() } });
      if (updated.count !== 1) throw new Error("Recognition transition is no longer available");
      const message = await transaction.message.create({ data: { conversationId, role: "assistant", mode: "RECOGNIZE", content: generated.reply, internalSignals: generated.signals, model: generated.model, responseId: generated.responseId } });
      await transaction.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });
      return message;
    });
    return { ok: true as const, assistantMessage: serializeMessage(assistantMessage), mode: "RECOGNIZE" as const };
  } catch (error) {
    console.error("Starting RECOGNIZE failed", error);
    return { ok: false as const, error: "generation" as const };
  }
}

export async function saveRecognizedPattern(locale: Locale, conversationId: string, sourceMessageId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const source = await db.message.findFirst({ where: { id: sourceMessageId, conversationId, role: "assistant", mode: "RECOGNIZE", conversation: { userId: user.id } } });
  if (!source) return { ok: false as const };
  const statement = recognizedPatternOffer(source.internalSignals);
  if (!statement) return { ok: false as const };

  const pattern = await db.$transaction(async (transaction) => {
    const saved = await transaction.pattern.upsert({ where: { sourceMessageId }, create: { userId: user.id, conversationId, sourceMessageId, statement }, update: { statement } });
    await transaction.conversation.update({ where: { id: conversationId }, data: { status: "closed" } });
    return saved;
  });
  return { ok: true as const, patternId: pattern.id };
}
