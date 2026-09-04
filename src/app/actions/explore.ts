"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { generateExploreResponse } from "@/lib/explore";
import { exploreMessageSchema, exploreSignalsSchema, titleFromExploreMessage } from "@/lib/explore-contract";
import { LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/life-areas";
import { shouldOfferRecognition } from "@/lib/mode-orchestration";
import { calculateNatalChart, NATAL_ENGINE, NATAL_ENGINE_VERSION, NATAL_SCHEMA_VERSION } from "@/lib/natal-chart";
import { ensureNatalInterpretation } from "@/lib/natal-interpretation-persistence";
import { generateRecognizeResponse } from "@/lib/recognize";
import {
  applyCandidateEvaluation,
  candidateEvaluationActionSchema,
  candidateEvaluationOffer,
  candidateEvaluationPromptContext,
  recognizedPatternOffer,
  type CandidateEvaluationAction,
  type CandidateEvaluationOffer,
} from "@/lib/recognize-contract";

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
  | { ok: true; conversationId: string; userMessage?: ConversationMessage; assistantMessage: ConversationMessage; mode: ConversationMode; transitionOffered: boolean; candidateEvaluationOffer: CandidateEvaluationOffer | null; patternSaveOffer: PatternSaveOffer | null }
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

function evaluationOfferFromMessage(message: { id: string; internalSignals: unknown }) {
  return candidateEvaluationOffer(message.id, message.internalSignals);
}

async function loadGenerationContext(userId: string, locale: Locale, conversationId: string, excludedMessageId?: string) {
  const [intent, storedNatalChart, birthProfile, conversation, recentMessages, preferences] = await Promise.all([
    db.initialIntent.findUnique({ where: { userId } }),
    db.natalChart.findUnique({ where: { userId } }),
    db.birthProfile.findUnique({ where: { userId } }),
    db.conversation.findFirst({ where: { id: conversationId, userId, archivedAt: null } }),
    db.message.findMany({ where: { conversationId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 25 }),
    db.user.findUnique({ where: { id: userId }, select: { astrologyFamiliarity: true, astrologyStyle: true } }),
  ]);

  if (!intent?.discoveryCompletedAt || !storedNatalChart || !birthProfile || !conversation || !preferences) throw new Error("Completed conversation context is unavailable");
  let natalChart = storedNatalChart;
  if (storedNatalChart.schemaVersion !== NATAL_SCHEMA_VERSION) {
    if (birthProfile.latitude === null || birthProfile.longitude === null || !birthProfile.timezoneId) throw new Error("Birth profile is incomplete");
    const calculation = calculateNatalChart({
      birthDate: birthProfile.birthDate,
      birthTimeMinutes: birthProfile.birthTimeMinutes,
      latitude: Number(birthProfile.latitude),
      longitude: Number(birthProfile.longitude),
      timezoneId: birthProfile.timezoneId,
    });
    natalChart = await db.natalChart.update({
      where: { id: storedNatalChart.id },
      data: {
        engine: NATAL_ENGINE,
        engineVersion: NATAL_ENGINE_VERSION,
        schemaVersion: NATAL_SCHEMA_VERSION,
        inputHash: calculation.inputHash,
        timeAccuracy: calculation.timeAccuracy,
        houseSystem: calculation.houseSystem,
        sourceProfileUpdated: birthProfile.updatedAt,
        calculatedAt: new Date(),
        data: calculation.data,
      },
    });
  }
  const messages = getDictionary(locale);
  const lifeAreaKeys = intent.lifeAreas.flatMap((value) => {
    const key = z.enum(LIFE_AREA_KEYS).safeParse(value);
    return key.success ? [key.data as LifeAreaKey] : [];
  });
  const lifeAreas = lifeAreaKeys.map((key) => messages.initialIntent.areas[key]);
  const natalInterpretation = await ensureNatalInterpretation(userId, natalChart);
  const generationMessages = recentMessages.reverse().filter((message) => message.id !== excludedMessageId);
  const precedingMessage = generationMessages.at(-1);
  const evaluationContext = precedingMessage?.role === "assistant" ? candidateEvaluationPromptContext(precedingMessage.internalSignals) : null;
  const recentResponseApproaches = generationMessages
    .filter((message) => message.role === "assistant" && message.mode === "EXPLORE")
    .slice(-4)
    .flatMap((message) => {
      const parsed = exploreSignalsSchema.safeParse(message.internalSignals);
      return parsed.success ? [parsed.data.responseApproach] : [];
    });
  const thread = generationMessages.map((message) => ({ role: message.role, content: message.content }));
  return { intent, conversation, thread, lifeAreaKeys, lifeAreas, natalInterpretation, preferences, evaluationContext, recentResponseApproaches };
}

async function generateReply(userId: string, locale: Locale, conversationId: string, userMessage: StoredMessage) {
  const context = await loadGenerationContext(userId, locale, conversationId, userMessage.id);
  const generated = context.conversation.mode === "RECOGNIZE"
    ? await generateRecognizeResponse({ locale, lifeAreaKeys: context.lifeAreaKeys, lifeAreas: context.lifeAreas, currentContext: context.intent.currentContext, initialQuestions: context.intent.discoveryQuestions, initialAnswers: context.intent.initialAnswers, finalQuestions: context.intent.finalQuestions, finalAnswers: context.intent.finalAnswers, natalInterpretation: context.natalInterpretation, astrologyFamiliarity: context.preferences.astrologyFamiliarity, astrologyStyle: context.preferences.astrologyStyle, thread: context.thread, latestMessage: userMessage.content, opening: false, candidateEvaluationContext: context.evaluationContext })
    : await generateExploreResponse({ locale, lifeAreaKeys: context.lifeAreaKeys, lifeAreas: context.lifeAreas, currentContext: context.intent.currentContext, initialQuestions: context.intent.discoveryQuestions, initialAnswers: context.intent.initialAnswers, finalQuestions: context.intent.finalQuestions, finalAnswers: context.intent.finalAnswers, natalInterpretation: context.natalInterpretation, astrologyFamiliarity: context.preferences.astrologyFamiliarity, astrologyStyle: context.preferences.astrologyStyle, thread: context.thread, latestMessage: userMessage.content, candidateEvaluationContext: context.evaluationContext, recentResponseApproaches: context.recentResponseApproaches });

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

  return {
    assistantMessage,
    mode,
    transitionOffered,
    candidateEvaluationOffer: mode === "RECOGNIZE" ? evaluationOfferFromMessage(assistantMessage) : null,
    patternSaveOffer: mode === "RECOGNIZE" ? patternOfferFromMessage(assistantMessage) : null,
  };
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
    const conversation = await db.conversation.findFirst({ where: { id: activeConversationId, userId: user.id, status: "active", archivedAt: null } });
    if (!conversation) return { ok: false, error: "message" };
    const latestMessage = await db.message.findFirst({ where: { conversationId: activeConversationId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if (latestMessage && (evaluationOfferFromMessage(latestMessage) || patternOfferFromMessage(latestMessage))) return { ok: false, error: "message" };
    userMessage = await db.message.create({ data: { conversationId: activeConversationId, role: "user", mode: conversation.mode, content: parsed.data } });
    await db.conversation.update({ where: { id: activeConversationId }, data: { lastMessageAt: userMessage.createdAt } });
  } else {
    const conversation = await db.conversation.create({ data: { userId: user.id, mode: "EXPLORE", title: titleFromExploreMessage(parsed.data), messages: { create: { role: "user", mode: "EXPLORE", content: parsed.data } } }, include: { messages: true } });
    activeConversationId = conversation.id;
    userMessage = conversation.messages[0];
  }

  try {
    const result = await generateReply(user.id, locale, activeConversationId, userMessage);
    return { ok: true, conversationId: activeConversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(result.assistantMessage), mode: result.mode, transitionOffered: result.transitionOffered, candidateEvaluationOffer: result.candidateEvaluationOffer, patternSaveOffer: result.patternSaveOffer };
  } catch (error) {
    console.error("Conversation response generation failed", error);
    return { ok: false, error: "generation", conversationId: activeConversationId, userMessage: serializeMessage(userMessage) };
  }
}

export async function retryExploreResponse(locale: Locale, conversationId: string, userMessageId: string): Promise<ConversationActionResult> {
  if (!isLocale(locale)) return { ok: false, error: "message" };
  const user = await requireCurrentUser(locale);
  const userMessage = await db.message.findFirst({ where: { id: userMessageId, role: "user", conversation: { id: conversationId, userId: user.id, status: "active", archivedAt: null } } });
  if (!userMessage) return { ok: false, error: "message" };
  const existingReply = await db.message.findUnique({ where: { inReplyToId: userMessage.id }, include: { conversation: true } });
  if (existingReply) return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(existingReply), mode: existingReply.conversation.mode, transitionOffered: existingReply.conversation.transitionState === "OFFERED", candidateEvaluationOffer: evaluationOfferFromMessage(existingReply), patternSaveOffer: patternOfferFromMessage(existingReply) };

  try {
    const result = await generateReply(user.id, locale, conversationId, userMessage);
    return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(result.assistantMessage), mode: result.mode, transitionOffered: result.transitionOffered, candidateEvaluationOffer: result.candidateEvaluationOffer, patternSaveOffer: result.patternSaveOffer };
  } catch (error) {
    console.error("Conversation response retry failed", error);
    return { ok: false, error: "generation", conversationId, userMessage: serializeMessage(userMessage) };
  }
}

export async function declineRecognitionTransition(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const latestMessage = await db.message.findFirst({ where: { conversationId, conversation: { userId: user.id } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const result = await db.conversation.updateMany({ where: { id: conversationId, userId: user.id, mode: "EXPLORE", status: "active", archivedAt: null, transitionState: "OFFERED" }, data: { transitionState: "DISMISSED", transitionReferenceAt: latestMessage?.createdAt ?? new Date() } });
  return { ok: result.count === 1 } as const;
}

export async function acceptRecognitionTransition(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "message" as const };
  const user = await requireCurrentUser(locale);
  const context = await loadGenerationContext(user.id, locale, conversationId);
  if (context.conversation.status !== "active" || context.conversation.archivedAt || context.conversation.mode !== "EXPLORE" || context.conversation.transitionState !== "OFFERED") return { ok: false as const, error: "message" as const };

  try {
    const generated = await generateRecognizeResponse({ locale, lifeAreaKeys: context.lifeAreaKeys, lifeAreas: context.lifeAreas, currentContext: context.intent.currentContext, initialQuestions: context.intent.discoveryQuestions, initialAnswers: context.intent.initialAnswers, finalQuestions: context.intent.finalQuestions, finalAnswers: context.intent.finalAnswers, natalInterpretation: context.natalInterpretation, astrologyFamiliarity: context.preferences.astrologyFamiliarity, astrologyStyle: context.preferences.astrologyStyle, thread: context.thread, latestMessage: null, opening: true });
    const assistantMessage = await db.$transaction(async (transaction) => {
      const updated = await transaction.conversation.updateMany({ where: { id: conversationId, userId: user.id, mode: "EXPLORE", status: "active", archivedAt: null, transitionState: "OFFERED" }, data: { mode: "RECOGNIZE", transitionState: "IDLE", transitionReferenceAt: new Date() } });
      if (updated.count !== 1) throw new Error("Recognition transition is no longer available");
      const message = await transaction.message.create({ data: { conversationId, role: "assistant", mode: "RECOGNIZE", content: generated.reply, internalSignals: generated.signals, model: generated.model, responseId: generated.responseId } });
      await transaction.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });
      return message;
    });
    return { ok: true as const, assistantMessage: serializeMessage(assistantMessage), mode: "RECOGNIZE" as const, candidateEvaluationOffer: evaluationOfferFromMessage(assistantMessage) };
  } catch (error) {
    console.error("Starting RECOGNIZE failed", error);
    return { ok: false as const, error: "generation" as const };
  }
}

export async function evaluateRecognizeCandidate(locale: Locale, conversationId: string, sourceMessageId: string, action: CandidateEvaluationAction) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedAction = candidateEvaluationActionSchema.safeParse(action);
  if (!parsedAction.success) return { ok: false as const };
  const user = await requireCurrentUser(locale);

  const result = await db.$transaction(async (transaction) => {
    const conversation = await transaction.conversation.findFirst({
      where: { id: conversationId, userId: user.id, mode: "RECOGNIZE", status: "active", archivedAt: null },
    });
    const source = await transaction.message.findFirst({
      where: { id: sourceMessageId, conversationId, role: "assistant", mode: "RECOGNIZE" },
    });
    const latestMessage = await transaction.message.findFirst({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    if (!conversation || !source || latestMessage?.id !== source.id) return null;

    const nextSignals = applyCandidateEvaluation(source.internalSignals, parsedAction.data);
    if (!nextSignals) return null;
    await transaction.message.update({ where: { id: source.id }, data: { internalSignals: nextSignals } });

    const mode: ConversationMode = parsedAction.data === "NO" ? "EXPLORE" : "RECOGNIZE";
    if (mode === "EXPLORE") {
      await transaction.conversation.update({
        where: { id: conversationId },
        data: { mode, transitionState: "DISMISSED", transitionReferenceAt: new Date() },
      });
    }

    return {
      mode,
      candidateEvaluationOffer: candidateEvaluationOffer(source.id, nextSignals),
      patternSaveOffer: patternOfferFromMessage({ id: source.id, internalSignals: nextSignals }),
    };
  });

  return result ? { ok: true as const, ...result } : { ok: false as const };
}

export async function saveRecognizedPattern(locale: Locale, conversationId: string, sourceMessageId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const source = await db.message.findFirst({ where: { id: sourceMessageId, conversationId, role: "assistant", mode: "RECOGNIZE", conversation: { userId: user.id, archivedAt: null } } });
  if (!source) return { ok: false as const };
  const statement = recognizedPatternOffer(source.internalSignals);
  if (!statement) return { ok: false as const };

  const pattern = await db.$transaction(async (transaction) => {
    const available = await transaction.conversation.updateMany({
      where: { id: conversationId, userId: user.id, status: "active", archivedAt: null },
      data: { status: "closed" },
    });
    if (available.count !== 1) throw new Error("Conversation is no longer available for Pattern saving");
    const saved = await transaction.pattern.upsert({ where: { sourceMessageId }, create: { userId: user.id, conversationId, sourceMessageId, statement }, update: { statement } });
    return saved;
  });
  return { ok: true as const, patternId: pattern.id };
}
