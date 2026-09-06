"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireCurrentUser } from "@/lib/auth-user";
import { generateExploreResponse } from "@/lib/explore";
import { exploreMessageSchema, parseStoredExploreSignals, titleFromExploreMessage } from "@/lib/explore-contract";
import { generateIntegrateResponse } from "@/lib/integrate";
import { applyPracticeActivation, livedEvidenceFromIntegrate, practiceProposalOffer, shouldOfferMapItemRevision, type PracticeProposalOffer } from "@/lib/integrate-contract";
import { LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/life-areas";
import { shouldOfferRecognition } from "@/lib/mode-orchestration";
import { calculateNatalChart, NATAL_ENGINE, NATAL_ENGINE_VERSION, NATAL_SCHEMA_VERSION } from "@/lib/natal-chart";
import { ensureNatalInterpretation } from "@/lib/natal-interpretation-persistence";
import {
  chartThemeIdSchema,
  chartThemePresentation,
  NATAL_INTERPRETATION_EVIDENCE_STATUS,
  NATAL_INTERPRETATION_SOURCE,
  themeConversationStarterSchema,
} from "@/lib/natal-interpretation";
import { generateRecognizeResponse } from "@/lib/recognize";
import {
  applyCandidateEvaluation,
  candidateEvaluationActionSchema,
  candidateEvaluationOffer,
  candidateEvaluationPromptContext,
  recognizedMapItemOffer,
  type CandidateEvaluationAction,
  type CandidateEvaluationOffer,
} from "@/lib/recognize-contract";
import { isSupportedPracticeProposal, practiceIntentionSchema, type PracticeProposal } from "@/lib/practices";
import { mapItemIdSchema } from "@/lib/map-items";

export type ConversationMode = "EXPLORE" | "RECOGNIZE" | "INTEGRATE";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  mode: ConversationMode;
  content: string;
  createdAt: string;
};

export type MapItemSaveOffer = { messageId: string; kind: "PATTERN" | "INSIGHT"; statement: string; mapItemId?: string };
export type ActivePractice = PracticeProposal & { id: string; intention: string };

export type ConversationActionResult =
  | { ok: true; conversationId: string; userMessage?: ConversationMessage; assistantMessage: ConversationMessage; mode: ConversationMode; transitionOffered: boolean; candidateEvaluationOffer: CandidateEvaluationOffer | null; mapItemSaveOffer: MapItemSaveOffer | null; practiceProposalOffer: PracticeProposalOffer | null; activePractice: ActivePractice | null }
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

function mapItemOfferFromMessage(message: { id: string; internalSignals: unknown }) {
  const item = recognizedMapItemOffer(message.internalSignals);
  return item ? { messageId: message.id, ...item } : null;
}

function evaluationOfferFromMessage(message: { id: string; internalSignals: unknown }) {
  return candidateEvaluationOffer(message.id, message.internalSignals);
}

function practiceOfferFromMessage(message: { id: string; internalSignals: unknown }) {
  return practiceProposalOffer(message.id, message.internalSignals);
}

function serializePractice(practice: { id: string; intention: string; purpose: ActivePractice["purpose"]; primitive: ActivePractice["primitive"]; instruction: string; cue: string } | null): ActivePractice | null {
  return practice ? { id: practice.id, intention: practice.intention, purpose: practice.purpose, primitive: practice.primitive, instruction: practice.instruction, cue: practice.cue } : null;
}

async function loadGenerationContext(userId: string, locale: Locale, conversationId: string, excludedMessageId?: string) {
  const [intent, storedNatalChart, birthProfile, conversation, recentMessages, preferences] = await Promise.all([
    db.initialIntent.findUnique({ where: { userId } }),
    db.natalChart.findUnique({ where: { userId } }),
    db.birthProfile.findUnique({ where: { userId } }),
    db.conversation.findFirst({ where: { id: conversationId, userId, archivedAt: null }, include: { focalMapItem: true } }),
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
      const parsed = parseStoredExploreSignals(message.internalSignals);
      return parsed ? [parsed.responseApproach] : [];
    });
  const thread = generationMessages.map((message) => ({ role: message.role, content: message.content }));
  const activePractice = conversation.focalMapItemId
    ? await db.practice.findFirst({
        where: { userId, mapItemId: conversation.focalMapItemId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      })
    : null;
  const recentObservations = activePractice ? await db.practiceObservation.findMany({ where: { practiceId: activePractice.id, userId }, orderBy: { createdAt: "desc" }, take: 5, select: { content: true, learning: true } }) : [];
  return { intent, conversation, thread, lifeAreaKeys, lifeAreas, natalInterpretation, preferences, evaluationContext, recentResponseApproaches, activePractice, recentObservations: recentObservations.reverse() };
}

async function generateReply(userId: string, locale: Locale, conversationId: string, userMessage: StoredMessage) {
  const context = await loadGenerationContext(userId, locale, conversationId, userMessage.id);
  if (context.conversation.mode === "INTEGRATE" && !context.conversation.focalMapItem) {
    throw new Error("INTEGRATE requires a focal Map item");
  }
  const themeStarter = themeConversationStarterSchema.safeParse(userMessage.internalSignals);
  const generated = context.conversation.mode === "RECOGNIZE"
    ? await generateRecognizeResponse({ locale, lifeAreaKeys: context.lifeAreaKeys, lifeAreas: context.lifeAreas, currentContext: context.intent.currentContext, initialQuestions: context.intent.discoveryQuestions, initialAnswers: context.intent.initialAnswers, finalQuestions: context.intent.finalQuestions, finalAnswers: context.intent.finalAnswers, natalInterpretation: context.natalInterpretation, astrologyFamiliarity: context.preferences.astrologyFamiliarity, astrologyStyle: context.preferences.astrologyStyle, thread: context.thread, latestMessage: userMessage.content, opening: false, candidateEvaluationContext: context.evaluationContext, focalMapItem: context.conversation.focalMapItem ? { kind: context.conversation.focalMapItem.kind, statement: context.conversation.focalMapItem.statement } : null })
    : context.conversation.mode === "INTEGRATE" && context.conversation.focalMapItem
      ? await generateIntegrateResponse({ locale, focalMapItem: { kind: context.conversation.focalMapItem.kind, statement: context.conversation.focalMapItem.statement }, intention: context.activePractice?.intention ?? context.thread.find((message) => message.role === "user")?.content ?? userMessage.content, thread: context.thread, latestMessage: userMessage.content, activePractice: context.activePractice ? { intention: context.activePractice.intention, purpose: context.activePractice.purpose, primitive: context.activePractice.primitive, instruction: context.activePractice.instruction, cue: context.activePractice.cue } : null, recentObservations: context.recentObservations, astrologyFamiliarity: context.preferences.astrologyFamiliarity, astrologyStyle: context.preferences.astrologyStyle })
      : await generateExploreResponse({ locale, lifeAreaKeys: context.lifeAreaKeys, lifeAreas: context.lifeAreas, currentContext: context.intent.currentContext, initialQuestions: context.intent.discoveryQuestions, initialAnswers: context.intent.initialAnswers, finalQuestions: context.intent.finalQuestions, finalAnswers: context.intent.finalAnswers, natalInterpretation: context.natalInterpretation, astrologyFamiliarity: context.preferences.astrologyFamiliarity, astrologyStyle: context.preferences.astrologyStyle, thread: context.thread, latestMessage: userMessage.content, candidateEvaluationContext: context.evaluationContext, recentResponseApproaches: context.recentResponseApproaches, preferredThemeId: themeStarter.success ? themeStarter.data.themeId : null });

  const persisted = await db.$transaction(async (transaction) => {
    const assistantMessage = await transaction.message.create({
      data: { conversationId, role: "assistant", mode: context.conversation.mode, content: generated.reply, internalSignals: generated.signals, model: generated.model, responseId: generated.responseId, inReplyToId: userMessage.id },
    });

    const newEvidence = generated.signals.currentMode === "INTEGRATE" ? livedEvidenceFromIntegrate(generated.signals) : null;
    if (newEvidence && context.activePractice) {
      await transaction.practiceObservation.upsert({
        where: { sourceMessageId: userMessage.id },
        create: { userId, practiceId: context.activePractice.id, conversationId, sourceMessageId: userMessage.id, content: userMessage.content, learning: newEvidence },
        update: { content: userMessage.content, learning: newEvidence },
      });
    }

    let mode: ConversationMode = context.conversation.mode;
    let transitionOffered = context.conversation.transitionState === "OFFERED";

    if (mode === "EXPLORE" && !transitionOffered) {
      const recentSignals = await transaction.message.findMany({ where: { conversationId, role: "assistant", mode: "EXPLORE" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 3, select: { createdAt: true, internalSignals: true } });
      transitionOffered = shouldOfferRecognition(recentSignals.reverse(), context.conversation.transitionReferenceAt);
    }
    if (mode === "INTEGRATE" && shouldOfferMapItemRevision(generated.signals)) {
      transitionOffered = true;
    }

    const returningToExplore = mode === "RECOGNIZE" && generated.signals.currentMode === "RECOGNIZE" && generated.signals.userEvaluationStatus === "rejected" && generated.signals.recommendedNextMode === "EXPLORE";
    if (returningToExplore) {
      mode = "EXPLORE";
      transitionOffered = false;
    }

    await transaction.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: assistantMessage.createdAt,
        mode,
        transitionState: transitionOffered ? "OFFERED" : returningToExplore ? "DISMISSED" : context.conversation.transitionState,
        transitionReferenceAt: returningToExplore ? assistantMessage.createdAt : context.conversation.transitionReferenceAt,
      },
    });
    return { assistantMessage, mode, transitionOffered };
  });

  return {
    assistantMessage: persisted.assistantMessage,
    mode: persisted.mode,
    transitionOffered: persisted.transitionOffered,
    candidateEvaluationOffer: persisted.mode === "RECOGNIZE" ? evaluationOfferFromMessage(persisted.assistantMessage) : null,
    mapItemSaveOffer: persisted.mode === "RECOGNIZE" ? mapItemOfferFromMessage(persisted.assistantMessage) : null,
    practiceProposalOffer: persisted.mode === "INTEGRATE" ? practiceOfferFromMessage(persisted.assistantMessage) : null,
    activePractice: serializePractice(context.activePractice),
  };
}

export async function sendExploreMessage(
  locale: Locale,
  conversationId: string | null,
  content: string,
  startingThemeId?: string | null,
): Promise<ConversationActionResult> {
  if (!isLocale(locale)) return { ok: false, error: "message" };
  const parsed = exploreMessageSchema.safeParse(content);
  if (!parsed.success) return { ok: false, error: "message" };
  const user = await requireCurrentUser(locale);
  const intent = await db.initialIntent.findUnique({ where: { userId: user.id } });
  if (!intent?.discoveryCompletedAt) return { ok: false, error: "message" };

  let themeStarter: z.infer<typeof themeConversationStarterSchema> | null = null;
  let themeTitle: string | null = null;
  if (startingThemeId) {
    if (conversationId) return { ok: false, error: "message" };
    const parsedThemeId = chartThemeIdSchema.safeParse(startingThemeId);
    if (!parsedThemeId.success) return { ok: false, error: "message" };
    const natalChart = await db.natalChart.findUnique({ where: { userId: user.id } });
    if (!natalChart) return { ok: false, error: "message" };
    const natalInterpretation = await ensureNatalInterpretation(user.id, natalChart);
    const theme = natalInterpretation.chartAtAGlance.themes.find(
      (candidate) => candidate.id === parsedThemeId.data,
    );
    if (!theme) return { ok: false, error: "message" };
    themeStarter = {
      source: NATAL_INTERPRETATION_SOURCE,
      evidenceStatus: NATAL_INTERPRETATION_EVIDENCE_STATUS,
      themeId: theme.id,
    };
    themeTitle = chartThemePresentation(theme, locale).title;
  }

  let activeConversationId = conversationId;
  let userMessage: StoredMessage;
  if (activeConversationId) {
    const conversation = await db.conversation.findFirst({ where: { id: activeConversationId, userId: user.id, status: "active", archivedAt: null } });
    if (!conversation || conversation.transitionState === "OFFERED") return { ok: false, error: "message" };
    const latestMessage = await db.message.findFirst({ where: { conversationId: activeConversationId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if (latestMessage && (evaluationOfferFromMessage(latestMessage) || mapItemOfferFromMessage(latestMessage) || practiceOfferFromMessage(latestMessage))) return { ok: false, error: "message" };
    userMessage = await db.message.create({ data: { conversationId: activeConversationId, role: "user", mode: conversation.mode, content: parsed.data } });
    await db.conversation.update({ where: { id: activeConversationId }, data: { lastMessageAt: userMessage.createdAt } });
  } else {
    const conversation = await db.conversation.create({
      data: {
        userId: user.id,
        mode: "EXPLORE",
        title: themeTitle ?? titleFromExploreMessage(parsed.data),
        messages: {
          create: {
            role: "user",
            mode: "EXPLORE",
            content: parsed.data,
            internalSignals: themeStarter ?? undefined,
          },
        },
      },
      include: { messages: true },
    });
    activeConversationId = conversation.id;
    userMessage = conversation.messages[0];
  }

  try {
    const result = await generateReply(user.id, locale, activeConversationId, userMessage);
    return { ok: true, conversationId: activeConversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(result.assistantMessage), mode: result.mode, transitionOffered: result.transitionOffered, candidateEvaluationOffer: result.candidateEvaluationOffer, mapItemSaveOffer: result.mapItemSaveOffer, practiceProposalOffer: result.practiceProposalOffer, activePractice: result.activePractice };
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
  if (existingReply) {
    const practice = existingReply.conversation.focalMapItemId ? await db.practice.findFirst({ where: { userId: user.id, mapItemId: existingReply.conversation.focalMapItemId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }) : null;
    return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(existingReply), mode: existingReply.conversation.mode, transitionOffered: existingReply.conversation.transitionState === "OFFERED", candidateEvaluationOffer: evaluationOfferFromMessage(existingReply), mapItemSaveOffer: mapItemOfferFromMessage(existingReply), practiceProposalOffer: practiceOfferFromMessage(existingReply), activePractice: serializePractice(practice) };
  }

  try {
    const result = await generateReply(user.id, locale, conversationId, userMessage);
    return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(result.assistantMessage), mode: result.mode, transitionOffered: result.transitionOffered, candidateEvaluationOffer: result.candidateEvaluationOffer, mapItemSaveOffer: result.mapItemSaveOffer, practiceProposalOffer: result.practiceProposalOffer, activePractice: result.activePractice };
  } catch (error) {
    console.error("Conversation response retry failed", error);
    return { ok: false, error: "generation", conversationId, userMessage: serializeMessage(userMessage) };
  }
}

export async function declineRecognitionTransition(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const latestMessage = await db.message.findFirst({ where: { conversationId, conversation: { userId: user.id } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const result = await db.conversation.updateMany({ where: { id: conversationId, userId: user.id, mode: { in: ["EXPLORE", "INTEGRATE"] }, status: "active", archivedAt: null, transitionState: "OFFERED" }, data: { transitionState: "DISMISSED", transitionReferenceAt: latestMessage?.createdAt ?? new Date() } });
  return { ok: result.count === 1 } as const;
}

export async function acceptRecognitionTransition(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "message" as const };
  const user = await requireCurrentUser(locale);
  const context = await loadGenerationContext(user.id, locale, conversationId);
  const sourceMode = context.conversation.mode;
  if (context.conversation.status !== "active" || context.conversation.archivedAt || (sourceMode !== "EXPLORE" && sourceMode !== "INTEGRATE") || context.conversation.transitionState !== "OFFERED") return { ok: false as const, error: "message" as const };

  try {
    const focalMapItem = context.conversation.focalMapItem ? { kind: context.conversation.focalMapItem.kind, statement: context.conversation.focalMapItem.statement } : null;
    const generated = await generateRecognizeResponse({ locale, lifeAreaKeys: context.lifeAreaKeys, lifeAreas: context.lifeAreas, currentContext: context.intent.currentContext, initialQuestions: context.intent.discoveryQuestions, initialAnswers: context.intent.initialAnswers, finalQuestions: context.intent.finalQuestions, finalAnswers: context.intent.finalAnswers, natalInterpretation: context.natalInterpretation, astrologyFamiliarity: context.preferences.astrologyFamiliarity, astrologyStyle: context.preferences.astrologyStyle, thread: context.thread, latestMessage: null, opening: true, focalMapItem });
    const assistantMessage = await db.$transaction(async (transaction) => {
      const updated = await transaction.conversation.updateMany({ where: { id: conversationId, userId: user.id, mode: sourceMode, status: "active", archivedAt: null, transitionState: "OFFERED" }, data: { mode: "RECOGNIZE", transitionState: "IDLE", transitionReferenceAt: new Date() } });
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

    const mode: ConversationMode = parsedAction.data === "NO" ? (conversation.focalMapItemId ? "INTEGRATE" : "EXPLORE") : "RECOGNIZE";
    if (mode !== "RECOGNIZE") {
      await transaction.conversation.update({
        where: { id: conversationId },
        data: { mode, transitionState: "DISMISSED", transitionReferenceAt: new Date() },
      });
    }

    return {
      mode,
      candidateEvaluationOffer: candidateEvaluationOffer(source.id, nextSignals),
      mapItemSaveOffer: mapItemOfferFromMessage({ id: source.id, internalSignals: nextSignals }),
    };
  });

  return result ? { ok: true as const, ...result } : { ok: false as const };
}

export async function saveRecognizedMapItem(locale: Locale, conversationId: string, sourceMessageId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const source = await db.message.findFirst({ where: { id: sourceMessageId, conversationId, role: "assistant", mode: "RECOGNIZE", conversation: { userId: user.id, archivedAt: null } } });
  if (!source) return { ok: false as const };
  const item = recognizedMapItemOffer(source.internalSignals);
  if (!item) return { ok: false as const };

  const mapItem = await db.$transaction(async (transaction) => {
    const conversation = await transaction.conversation.findFirst({
      where: { id: conversationId, userId: user.id, status: "active", archivedAt: null },
      select: { focalMapItemId: true },
    });
    if (!conversation) throw new Error("Conversation is no longer available for Map item saving");
    const available = await transaction.conversation.updateMany({
      where: { id: conversationId, userId: user.id, status: "active", archivedAt: null },
      data: { status: "closed" },
    });
    if (available.count !== 1) throw new Error("Conversation is no longer available for Map item saving");
    const existingItem = conversation.focalMapItemId
      ? await transaction.mapItem.findFirst({ where: { id: conversation.focalMapItemId, userId: user.id } })
      : null;
    const saved = existingItem
      ? await transaction.mapItem.update({ where: { id: existingItem.id }, data: { conversationId, sourceMessageId, kind: item.kind, statement: item.statement } })
      : await transaction.mapItem.upsert({ where: { sourceMessageId }, create: { userId: user.id, conversationId, sourceMessageId, kind: item.kind, statement: item.statement }, update: { kind: item.kind, statement: item.statement } });
    if (existingItem) {
      await transaction.practice.updateMany({ where: { userId: user.id, mapItemId: existingItem.id, status: "ACTIVE" }, data: { status: "PAUSED" } });
    }
    return saved;
  });
  return { ok: true as const, mapItemId: mapItem.id, kind: mapItem.kind };
}

export async function startIntegration(locale: Locale, mapItemId: string, intention: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "message" as const };
  const parsedMapItemId = mapItemIdSchema.safeParse(mapItemId);
  const parsedIntention = practiceIntentionSchema.safeParse(intention);
  if (!parsedMapItemId.success || !parsedIntention.success) return { ok: false as const, error: "message" as const };
  const user = await requireCurrentUser(locale);
  const mapItem = await db.mapItem.findFirst({ where: { id: parsedMapItemId.data, userId: user.id, archivedAt: null } });
  if (!mapItem) return { ok: false as const, error: "message" as const };

  const conversation = await db.conversation.create({
    data: {
      userId: user.id,
      mode: "INTEGRATE",
      focalMapItemId: mapItem.id,
      title: titleFromExploreMessage(`${mapItem.kind === "PATTERN" ? "Practice" : "Use this insight"}: ${mapItem.statement}`),
      messages: { create: { role: "user", mode: "INTEGRATE", content: parsedIntention.data } },
    },
    include: { messages: true },
  });
  const userMessage = conversation.messages[0];
  try {
    await generateReply(user.id, locale, conversation.id, userMessage);
    return { ok: true as const, conversationId: conversation.id };
  } catch (error) {
    console.error("Starting INTEGRATE failed", error);
    return { ok: false as const, error: "generation" as const, conversationId: conversation.id };
  }
}

export async function activatePractice(locale: Locale, conversationId: string, sourceMessageId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const result = await db.$transaction(async (transaction) => {
    const conversation = await transaction.conversation.findFirst({ where: { id: conversationId, userId: user.id, mode: "INTEGRATE", status: "active", archivedAt: null }, include: { focalMapItem: true } });
    const source = await transaction.message.findFirst({ where: { id: sourceMessageId, conversationId, role: "assistant", mode: "INTEGRATE" } });
    const latest = await transaction.message.findFirst({ where: { conversationId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if (!conversation?.focalMapItem || !source || latest?.id !== source.id) return null;
    const offer = practiceOfferFromMessage(source);
    if (!offer || !isSupportedPracticeProposal(offer.proposal)) return null;
    const existing = await transaction.practice.findFirst({ where: { userId: user.id, mapItemId: conversation.focalMapItem.id, status: "ACTIVE" } });
    if (existing) return null;
    const practice = await transaction.practice.create({ data: { userId: user.id, mapItemId: conversation.focalMapItem.id, conversationId, sourceMessageId, intention: offer.intention, ...offer.proposal } });
    const nextSignals = applyPracticeActivation(source.internalSignals, practice.id);
    if (!nextSignals) throw new Error("Practice proposal changed before activation");
    await transaction.message.update({ where: { id: source.id }, data: { internalSignals: nextSignals } });
    return practice;
  });
  return result ? { ok: true as const, activePractice: serializePractice(result) } : { ok: false as const };
}
