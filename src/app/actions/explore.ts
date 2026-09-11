"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { Prisma } from "@/generated/prisma/client";
import { isLocale, type Locale } from "@/i18n/config";
import { requireCurrentUser } from "@/lib/auth-user";
import { storedAstrologyProvenance } from "@/lib/astrology-provenance";
import { astrologyRetrievalState } from "@/lib/astrology-retrieval-state";
import { reasoningInterpretationContext } from "@/lib/astrology-model-context";
import {
  ConversationMessageLimitError,
  canAddAssistantMessage,
  canAddUserMessage,
  type ConversationMessageCounts,
} from "@/lib/conversation-limits";
import { hasUnresolvedConversationControl } from "@/lib/conversation-controls";
import { CONVERSATION_CONTEXT_VERSION } from "@/lib/conversation-context";
import {
  captureConversationContextSnapshot,
  ensureConversationProviderState,
} from "@/lib/conversation-context-persistence";
import { generateDeepExploreResponse } from "@/lib/deep-explore";
import { deepExploreFocusSchema, deepRecognitionHandoff } from "@/lib/deep-explore-contract";
import { generateExploreResponse } from "@/lib/explore";
import { exploreMessageSchema, parseStoredExploreSignals, titleFromExploreMessage } from "@/lib/explore-contract";
import { generateIntegrateResponse } from "@/lib/integrate";
import { applyPracticeActivation, applyPracticeProposalEvaluation, livedEvidenceFromIntegrate, practiceProposalEvaluationActionSchema, practiceProposalEvaluationContext, practiceProposalOffer, shouldOfferMapItemRevision, type PracticeProposalEvaluationAction, type PracticeProposalOffer } from "@/lib/integrate-contract";
import { shouldOfferRecognition } from "@/lib/mode-orchestration";
import { ensureNatalInterpretation } from "@/lib/natal-interpretation-persistence";
import {
  chartThemeIdSchema,
  chartThemePresentation,
  NATAL_INTERPRETATION_EVIDENCE_STATUS,
  NATAL_INTERPRETATION_SOURCE,
  themeConversationStarterSchema,
  retrieveNatalInterpretation,
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
import { recognitionHandoffFromOrigin, recognitionReturnMode, shouldReviseFocalMapItem } from "@/lib/recognition-handoff";
import { isSupportedPracticeProposal, practiceIntentionSchema, type PracticeProposal } from "@/lib/practices";
import { mapItemIdSchema } from "@/lib/map-items";

export type ConversationMode = "EXPLORE" | "RECOGNIZE" | "INTEGRATE" | "DEEP_EXPLORE";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  mode: ConversationMode;
  content: string;
  createdAt: string;
};

export type MapItemSaveOffer = { messageId: string; kind: "PATTERN" | "INSIGHT"; statement: string; mapItemId?: string };
export type ActivePractice = PracticeProposal & { id: string; intention: string };
const POST_SAVE_CONTINUATIONS = ["KEEP_TALKING", "DEEP_EXPLORE", "INTEGRATE"] as const;
export type PostSaveContinuation = (typeof POST_SAVE_CONTINUATIONS)[number];
const postSaveContinuationSchema = z.enum(POST_SAVE_CONTINUATIONS);

export type ConversationActionResult =
  | { ok: true; conversationId: string; userMessage?: ConversationMessage; assistantMessage: ConversationMessage; mode: ConversationMode; transitionOffered: boolean; candidateEvaluationOffer: CandidateEvaluationOffer | null; mapItemSaveOffer: MapItemSaveOffer | null; practiceProposalOffer: PracticeProposalOffer | null; activePractice: ActivePractice | null }
  | { ok: false; error: "message"; conversationId?: undefined; userMessage?: undefined }
  | { ok: false; error: "limit"; conversationId: string; userMessage?: ConversationMessage }
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

async function loadMessageCounts(
  transaction: Prisma.TransactionClient | typeof db,
  conversationId: string,
): Promise<ConversationMessageCounts> {
  const [user, assistant] = await Promise.all([
    transaction.message.count({ where: { conversationId, role: "user" } }),
    transaction.message.count({ where: { conversationId, role: "assistant" } }),
  ]);
  return { user, assistant };
}

async function serializableTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(operation, { isolationLevel: "Serializable" });
    } catch (error) {
      const shouldRetry = error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === "P2034"
        && attempt < 2;
      if (!shouldRetry) throw error;
    }
  }
  throw new Error("Serializable transaction retry limit reached");
}

async function loadRecognitionHandoff(userId: string, conversationId: string) {
  const origin = await db.message.findFirst({
    where: { conversationId, role: "assistant", mode: { in: ["EXPLORE", "INTEGRATE", "DEEP_EXPLORE"] }, conversation: { userId } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { mode: true, internalSignals: true },
  });
  return recognitionHandoffFromOrigin(origin);
}

function serializePractice(practice: { id: string; intention: string; purpose: ActivePractice["purpose"]; primitive: ActivePractice["primitive"]; instruction: string; cue: string } | null): ActivePractice | null {
  return practice ? { id: practice.id, intention: practice.intention, purpose: practice.purpose, primitive: practice.primitive, instruction: practice.instruction, cue: practice.cue } : null;
}

async function loadGenerationContext(userId: string, locale: Locale, conversationId: string, excludedMessageId?: string) {
  const [conversation, recentMessages, messageCounts] = await Promise.all([
    db.conversation.findFirst({ where: { id: conversationId, userId, archivedAt: null }, include: { focalMapItem: true } }),
    db.message.findMany({ where: { conversationId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 25 }),
    loadMessageCounts(db, conversationId),
  ]);

  if (!conversation) throw new Error("Completed conversation context is unavailable");
  const { providerConversationId, snapshot } = await ensureConversationProviderState({
    userId,
    locale,
    conversationId,
    excludedMessageId,
  });
  const generationMessages = recentMessages.reverse().filter((message) => message.id !== excludedMessageId);
  const precedingMessage = generationMessages.at(-1);
  const evaluationContext = precedingMessage?.role === "assistant" ? candidateEvaluationPromptContext(precedingMessage.internalSignals) : null;
  const practiceEvaluationContext = precedingMessage?.role === "assistant" ? practiceProposalEvaluationContext(precedingMessage.internalSignals) : null;
  const recentResponseApproaches = generationMessages
    .filter((message) => message.role === "assistant" && message.mode === "EXPLORE")
    .slice(-4)
    .flatMap((message) => {
      const parsed = parseStoredExploreSignals(message.internalSignals);
      return parsed ? [parsed.responseApproach] : [];
    });
  const recentAssistantSignals = generationMessages
    .filter((message) => message.role === "assistant")
    .slice(-4)
    .map((message) => message.internalSignals);
  const thread = generationMessages.map((message) => ({ role: message.role, content: message.content }));
  const activePractice = conversation.focalMapItemId
    ? await db.practice.findFirst({
        where: { userId, mapItemId: conversation.focalMapItemId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      })
    : null;
  const recentObservations = activePractice ? await db.practiceObservation.findMany({ where: { practiceId: activePractice.id, userId }, orderBy: { createdAt: "desc" }, take: 5, select: { content: true, learning: true } }) : [];
  return { conversation, thread, providerConversationId, snapshot, messageCounts, evaluationContext, practiceEvaluationContext, recentResponseApproaches, recentAssistantSignals, activePractice, recentObservations: recentObservations.reverse() };
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function sanitizeAstrologyProvenance<T extends {
  signals: { usedAstrologyFactorIds: string[]; usedTransitIds: string[] };
}>(generated: T, snapshot: Awaited<ReturnType<typeof ensureConversationProviderState>>["snapshot"]) {
  const allowedFactorIds = new Set(snapshot.natalInterpretation.rankedFactors.map((factor) => factor.id));
  const allowedTransitIds = new Set("currentTransits" in snapshot
    ? snapshot.currentTransits.activeAspects.map((aspect) => aspect.id)
    : []);
  generated.signals.usedAstrologyFactorIds = uniqueStrings(
    generated.signals.usedAstrologyFactorIds.filter((id) => allowedFactorIds.has(id)),
  );
  generated.signals.usedTransitIds = uniqueStrings(
    generated.signals.usedTransitIds.filter((id) => allowedTransitIds.has(id)),
  );
  return generated;
}

async function generateReply(userId: string, locale: Locale, conversationId: string, userMessage: StoredMessage) {
  const context = await loadGenerationContext(userId, locale, conversationId, userMessage.id);
  if (!canAddAssistantMessage(context.messageCounts)) {
    throw new ConversationMessageLimitError();
  }
  if ((context.conversation.mode === "INTEGRATE" || context.conversation.mode === "DEEP_EXPLORE") && !context.conversation.focalMapItem) {
    throw new Error(`${context.conversation.mode} requires a focal Map item`);
  }
  const themeStarter = themeConversationStarterSchema.safeParse(userMessage.internalSignals);
  const recognitionHandoff = context.conversation.mode === "RECOGNIZE" ? await loadRecognitionHandoff(userId, conversationId) : null;
  const recentProvenance = context.recentAssistantSignals.map(storedAstrologyProvenance);
  const latestMaterialProvenance = recentProvenance.toReversed().find((item) =>
    item.usedAstrologyFactorIds.length > 0 || item.usedTransitIds.length > 0,
  );
  const continuityFactorIds = latestMaterialProvenance?.usedAstrologyFactorIds ?? [];
  const continuityTransitIds = new Set(latestMaterialProvenance?.usedTransitIds ?? []);
  const transitActivatedFactorIds = "currentTransits" in context.snapshot
    ? (() => {
        const relevantContacts = context.snapshot.currentTransits.activeAspects.filter((aspect) => (
          continuityTransitIds.has(aspect.id) || continuityFactorIds.includes(aspect.natalPointId)
        ));
        const relevantContactIds = new Set(relevantContacts.map((aspect) => aspect.id));
        const activatedNatalAspects = context.snapshot.currentTransits.natalAspectActivations
          .filter((activation) => (
            continuityFactorIds.includes(activation.natalAspectId)
            || activation.transitContactIds.some((id) => relevantContactIds.has(id))
          ))
          .map((activation) => activation.natalAspectId);
        return uniqueStrings([
          ...relevantContacts.map((aspect) => aspect.natalPointId),
          ...activatedNatalAspects,
        ]);
      })()
    : [];
  const stateText = astrologyRetrievalState({
    focalMapItem: context.conversation.focalMapItem,
    recognitionHandoff,
    candidateEvaluationContext: context.evaluationContext,
    activePractice: context.activePractice,
    recentObservations: context.recentObservations,
    latestAssistantSignals: context.recentAssistantSignals.at(-1),
  });
  const retrievedInterpretation = retrieveNatalInterpretation(
    context.snapshot.natalInterpretation,
    {
      reason: "conversation",
      lifeAreas: context.snapshot.onboarding.selectedLifeAreaKeys,
      text: userMessage.content,
      stateText,
      continuityFactorIds,
      transitActivatedFactorIds,
      maxThemes: 0,
      maxFactors: 4,
      preferredThemeId: themeStarter.success ? themeStarter.data.themeId : null,
    },
  );
  const privateInterpretationContext = reasoningInterpretationContext(retrievedInterpretation);
  const usageContext = {
    userId,
    conversationId,
    messageId: userMessage.id,
    providerConversationId: context.providerConversationId,
    conversationResponseNumber: context.messageCounts.assistant + 1,
    contextSelection: retrievedInterpretation
      ? {
          ...retrievedInterpretation.selection,
          selectedFactors: retrievedInterpretation.factors.length,
          contextCharacters: JSON.stringify(privateInterpretationContext).length,
        }
      : null,
  };
  const generated = sanitizeAstrologyProvenance(context.conversation.mode === "RECOGNIZE"
    ? await generateRecognizeResponse({
        locale,
        providerConversationId: context.providerConversationId,
        latestMessage: userMessage.content,
        opening: false,
        candidateEvaluationContext: context.evaluationContext,
        focalMapItem: context.conversation.focalMapItem
          ? { kind: context.conversation.focalMapItem.kind, statement: context.conversation.focalMapItem.statement }
          : null,
        recognitionHandoff,
        privateInterpretationContext,
        usageContext,
      })
    : context.conversation.mode === "DEEP_EXPLORE" && context.conversation.focalMapItem
      ? await generateDeepExploreResponse({
          locale,
          providerConversationId: context.providerConversationId,
          focalMapItem: {
            kind: context.conversation.focalMapItem.kind,
            statement: context.conversation.focalMapItem.statement,
          },
          activePractice: context.activePractice
            ? {
                intention: context.activePractice.intention,
                instruction: context.activePractice.instruction,
                cue: context.activePractice.cue,
              }
            : null,
          latestMessage: userMessage.content,
          candidateEvaluationContext: context.evaluationContext,
          privateInterpretationContext,
          usageContext,
        })
    : context.conversation.mode === "INTEGRATE" && context.conversation.focalMapItem
      ? await generateIntegrateResponse({
          locale,
          providerConversationId: context.providerConversationId,
          focalMapItem: {
            kind: context.conversation.focalMapItem.kind,
            statement: context.conversation.focalMapItem.statement,
          },
          latestMessage: userMessage.content,
          activePractice: context.activePractice
            ? {
                intention: context.activePractice.intention,
                purpose: context.activePractice.purpose,
                primitive: context.activePractice.primitive,
                instruction: context.activePractice.instruction,
                cue: context.activePractice.cue,
              }
            : null,
          recentObservations: context.recentObservations,
          practiceProposalEvaluationContext: context.practiceEvaluationContext,
          privateInterpretationContext,
          usageContext,
        })
      : await generateExploreResponse({
          locale,
          providerConversationId: context.providerConversationId,
          thread: context.thread,
          latestMessage: userMessage.content,
          candidateEvaluationContext: context.evaluationContext,
          recentResponseApproaches: context.recentResponseApproaches,
          preferredThemeId: themeStarter.success ? themeStarter.data.themeId : null,
          privateInterpretationContext,
          usageContext,
        }), context.snapshot);

  const persisted = await serializableTransaction(async (transaction) => {
    const messageCounts = await loadMessageCounts(transaction, conversationId);
    if (!canAddAssistantMessage(messageCounts)) {
      throw new ConversationMessageLimitError();
    }
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
    if (mode === "DEEP_EXPLORE" && deepRecognitionHandoff(generated.signals)) {
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
    const existing = await serializableTransaction(async (transaction) => {
      const conversation = await transaction.conversation.findFirst({ where: { id: activeConversationId!, userId: user.id, status: "active", archivedAt: null } });
      if (!conversation || conversation.transitionState === "OFFERED") return { status: "unavailable" as const };
      const latestMessage = await transaction.message.findFirst({ where: { conversationId: activeConversationId! }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      const hasUnresolvedModeOffer = latestMessage && hasUnresolvedConversationControl(conversation.mode, latestMessage.internalSignals);
      if (hasUnresolvedModeOffer) return { status: "unavailable" as const };
      const messageCounts = await loadMessageCounts(transaction, activeConversationId!);
      if (!canAddUserMessage(messageCounts)) return { status: "limit" as const };
      const created = await transaction.message.create({ data: { conversationId: activeConversationId!, role: "user", mode: conversation.mode, content: parsed.data } });
      await transaction.conversation.update({ where: { id: activeConversationId! }, data: { lastMessageAt: created.createdAt } });
      return { status: "created" as const, message: created };
    });
    if (existing.status === "unavailable") return { ok: false, error: "message" };
    if (existing.status === "limit") return { ok: false, error: "limit", conversationId: activeConversationId };
    userMessage = existing.message;
  } else {
    const contextSnapshot = await captureConversationContextSnapshot(user.id, locale, {
      mode: "EXPLORE",
      focalMapItemId: null,
    });
    const conversation = await db.conversation.create({
      data: {
        userId: user.id,
        mode: "EXPLORE",
        contextVersion: CONVERSATION_CONTEXT_VERSION,
        contextSnapshot,
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
    if (error instanceof ConversationMessageLimitError) {
      return { ok: false, error: "limit", conversationId: activeConversationId, userMessage: serializeMessage(userMessage) };
    }
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
    const replyMode = existingReply.conversation.mode;
    return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(existingReply), mode: replyMode, transitionOffered: existingReply.conversation.transitionState === "OFFERED", candidateEvaluationOffer: replyMode === "RECOGNIZE" ? evaluationOfferFromMessage(existingReply) : null, mapItemSaveOffer: replyMode === "RECOGNIZE" ? mapItemOfferFromMessage(existingReply) : null, practiceProposalOffer: replyMode === "INTEGRATE" ? practiceOfferFromMessage(existingReply) : null, activePractice: serializePractice(practice) };
  }

  try {
    const result = await generateReply(user.id, locale, conversationId, userMessage);
    return { ok: true, conversationId, userMessage: serializeMessage(userMessage), assistantMessage: serializeMessage(result.assistantMessage), mode: result.mode, transitionOffered: result.transitionOffered, candidateEvaluationOffer: result.candidateEvaluationOffer, mapItemSaveOffer: result.mapItemSaveOffer, practiceProposalOffer: result.practiceProposalOffer, activePractice: result.activePractice };
  } catch (error) {
    if (error instanceof ConversationMessageLimitError) {
      return { ok: false, error: "limit", conversationId, userMessage: serializeMessage(userMessage) };
    }
    console.error("Conversation response retry failed", error);
    return { ok: false, error: "generation", conversationId, userMessage: serializeMessage(userMessage) };
  }
}

export async function declineRecognitionTransition(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const latestMessage = await db.message.findFirst({ where: { conversationId, conversation: { userId: user.id } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const result = await db.conversation.updateMany({ where: { id: conversationId, userId: user.id, mode: { in: ["EXPLORE", "INTEGRATE", "DEEP_EXPLORE"] }, status: "active", archivedAt: null, transitionState: "OFFERED" }, data: { transitionState: "DISMISSED", transitionReferenceAt: latestMessage?.createdAt ?? new Date() } });
  return { ok: result.count === 1 } as const;
}

export async function acceptRecognitionTransition(locale: Locale, conversationId: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "message" as const };
  const user = await requireCurrentUser(locale);
  const context = await loadGenerationContext(user.id, locale, conversationId);
  const sourceMode = context.conversation.mode;
  if (context.conversation.status !== "active" || context.conversation.archivedAt || (sourceMode !== "EXPLORE" && sourceMode !== "INTEGRATE" && sourceMode !== "DEEP_EXPLORE") || context.conversation.transitionState !== "OFFERED") return { ok: false as const, error: "message" as const };
  if (!canAddAssistantMessage(context.messageCounts)) return { ok: false as const, error: "limit" as const };

  try {
    const focalMapItem = context.conversation.focalMapItem ? { kind: context.conversation.focalMapItem.kind, statement: context.conversation.focalMapItem.statement } : null;
    const recognitionHandoff = await loadRecognitionHandoff(user.id, conversationId);
    if (sourceMode === "DEEP_EXPLORE" && !recognitionHandoff) return { ok: false as const, error: "message" as const };
    const recentProvenance = context.recentAssistantSignals.map(storedAstrologyProvenance);
    const continuityFactorIds = recentProvenance.toReversed().find((item) => item.usedAstrologyFactorIds.length > 0)?.usedAstrologyFactorIds ?? [];
    const retrievedInterpretation = retrieveNatalInterpretation(
      context.snapshot.natalInterpretation,
      {
        reason: "conversation",
        lifeAreas: context.snapshot.onboarding.selectedLifeAreaKeys,
        text: [focalMapItem?.statement, recognitionHandoff?.candidateMapItem?.statement].filter(Boolean).join(" "),
        stateText: astrologyRetrievalState({
          focalMapItem,
          recognitionHandoff,
          latestAssistantSignals: context.recentAssistantSignals.at(-1),
        }),
        continuityFactorIds,
        maxThemes: 0,
        maxFactors: 4,
      },
    );
    const privateInterpretationContext = reasoningInterpretationContext(retrievedInterpretation);
    const generated = sanitizeAstrologyProvenance(await generateRecognizeResponse({
      locale,
      providerConversationId: context.providerConversationId,
      latestMessage: null,
      opening: true,
      focalMapItem,
      recognitionHandoff,
      privateInterpretationContext,
      usageContext: {
        userId: user.id,
        conversationId,
        providerConversationId: context.providerConversationId,
        conversationResponseNumber: context.messageCounts.assistant + 1,
        contextSelection: retrievedInterpretation
          ? {
              ...retrievedInterpretation.selection,
              selectedFactors: retrievedInterpretation.factors.length,
              contextCharacters: JSON.stringify(privateInterpretationContext).length,
            }
          : null,
      },
    }), context.snapshot);
    const assistantMessage = await serializableTransaction(async (transaction) => {
      const messageCounts = await loadMessageCounts(transaction, conversationId);
      if (!canAddAssistantMessage(messageCounts)) {
        throw new ConversationMessageLimitError();
      }
      const updated = await transaction.conversation.updateMany({ where: { id: conversationId, userId: user.id, mode: sourceMode, status: "active", archivedAt: null, transitionState: "OFFERED" }, data: { mode: "RECOGNIZE", transitionState: "IDLE", transitionReferenceAt: new Date() } });
      if (updated.count !== 1) throw new Error("Recognition transition is no longer available");
      const message = await transaction.message.create({ data: { conversationId, role: "assistant", mode: "RECOGNIZE", content: generated.reply, internalSignals: generated.signals, model: generated.model, responseId: generated.responseId } });
      await transaction.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });
      return message;
    });
    return { ok: true as const, assistantMessage: serializeMessage(assistantMessage), mode: "RECOGNIZE" as const, candidateEvaluationOffer: evaluationOfferFromMessage(assistantMessage) };
  } catch (error) {
    if (error instanceof ConversationMessageLimitError) {
      return { ok: false as const, error: "limit" as const };
    }
    console.error("Starting RECOGNIZE failed", error);
    return { ok: false as const, error: "generation" as const };
  }
}

export async function evaluateRecognizeCandidate(locale: Locale, conversationId: string, sourceMessageId: string, action: CandidateEvaluationAction) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedAction = candidateEvaluationActionSchema.safeParse(action);
  if (!parsedAction.success) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const recognitionHandoff = await loadRecognitionHandoff(user.id, conversationId);

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

    const rejectionMode: ConversationMode = recognitionReturnMode(recognitionHandoff, Boolean(conversation.focalMapItemId));
    const mode: ConversationMode = parsedAction.data === "NO" ? rejectionMode : "RECOGNIZE";
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
  const recognitionHandoff = await loadRecognitionHandoff(user.id, conversationId);
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
    const latestMessage = await transaction.message.findFirst({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    if (latestMessage?.id !== sourceMessageId) throw new Error("The recognized item is no longer the latest conversation state");
    const revisesFocal = shouldReviseFocalMapItem(recognitionHandoff, Boolean(conversation.focalMapItemId));
    const existingItem = revisesFocal && conversation.focalMapItemId
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

export async function continueAfterMapItemSave(
  locale: Locale,
  conversationId: string,
  sourceMessageId: string,
  continuation: PostSaveContinuation,
) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedContinuation = postSaveContinuationSchema.safeParse(continuation);
  if (!parsedContinuation.success) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const recognitionHandoff = await loadRecognitionHandoff(user.id, conversationId);

  const result = await db.$transaction(async (transaction) => {
    const conversation = await transaction.conversation.findFirst({
      where: { id: conversationId, userId: user.id, status: { in: ["active", "closed"] }, archivedAt: null },
      select: { mode: true, status: true, focalMapItemId: true },
    });
    const latestMessage = await transaction.message.findFirst({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    const savedItem = await transaction.mapItem.findFirst({
      where: { sourceMessageId, conversationId, userId: user.id, archivedAt: null },
      select: { id: true },
    });
    if (!conversation || latestMessage?.id !== sourceMessageId || !savedItem) return null;

    const mode: ConversationMode = parsedContinuation.data === "KEEP_TALKING"
      ? recognitionReturnMode(recognitionHandoff, Boolean(conversation.focalMapItemId))
      : parsedContinuation.data;
    const focalMapItemId = parsedContinuation.data === "KEEP_TALKING"
      ? conversation.focalMapItemId
      : savedItem.id;
    const alreadyContinued = conversation.mode === mode &&
      conversation.status === "active" &&
      conversation.focalMapItemId === focalMapItemId;
    if (conversation.mode !== "RECOGNIZE" && !alreadyContinued) return null;
    if (!alreadyContinued) {
      await transaction.conversation.update({
        where: { id: conversationId },
        data: {
          mode,
          status: "active",
          focalMapItemId,
          transitionState: "IDLE",
          transitionReferenceAt: new Date(),
        },
      });
    }
    const activePractice = focalMapItemId
      ? await transaction.practice.findFirst({
          where: { userId: user.id, mapItemId: focalMapItemId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })
      : null;
    return { mode, activePractice };
  });

  return result
    ? { ok: true as const, mode: result.mode, activePractice: serializePractice(result.activePractice) }
    : { ok: false as const };
}

export async function startIntegration(locale: Locale, mapItemId: string, intention: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "message" as const };
  const parsedMapItemId = mapItemIdSchema.safeParse(mapItemId);
  const parsedIntention = practiceIntentionSchema.safeParse(intention);
  if (!parsedMapItemId.success || !parsedIntention.success) return { ok: false as const, error: "message" as const };
  const user = await requireCurrentUser(locale);
  const mapItem = await db.mapItem.findFirst({ where: { id: parsedMapItemId.data, userId: user.id, archivedAt: null } });
  if (!mapItem) return { ok: false as const, error: "message" as const };
  const contextSnapshot = await captureConversationContextSnapshot(user.id, locale, {
    mode: "INTEGRATE",
    focalMapItemId: mapItem.id,
  });

  const conversation = await db.conversation.create({
    data: {
      userId: user.id,
      mode: "INTEGRATE",
      focalMapItemId: mapItem.id,
      contextVersion: CONVERSATION_CONTEXT_VERSION,
      contextSnapshot,
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

export async function startDeepExploration(locale: Locale, mapItemId: string, focus: string) {
  if (!isLocale(locale)) return { ok: false as const, error: "message" as const };
  const parsedMapItemId = mapItemIdSchema.safeParse(mapItemId);
  const parsedFocus = deepExploreFocusSchema.safeParse(focus);
  if (!parsedMapItemId.success || !parsedFocus.success) return { ok: false as const, error: "message" as const };
  const user = await requireCurrentUser(locale);
  const mapItem = await db.mapItem.findFirst({ where: { id: parsedMapItemId.data, userId: user.id, archivedAt: null } });
  if (!mapItem) return { ok: false as const, error: "message" as const };
  const contextSnapshot = await captureConversationContextSnapshot(user.id, locale, {
    mode: "DEEP_EXPLORE",
    focalMapItemId: mapItem.id,
  });

  const conversation = await db.conversation.create({
    data: {
      userId: user.id,
      mode: "DEEP_EXPLORE",
      focalMapItemId: mapItem.id,
      contextVersion: CONVERSATION_CONTEXT_VERSION,
      contextSnapshot,
      title: titleFromExploreMessage(parsedFocus.data),
      messages: { create: { role: "user", mode: "DEEP_EXPLORE", content: parsedFocus.data } },
    },
    include: { messages: true },
  });
  const userMessage = conversation.messages[0];
  try {
    await generateReply(user.id, locale, conversation.id, userMessage);
    return { ok: true as const, conversationId: conversation.id };
  } catch (error) {
    console.error("Starting DEEP_EXPLORE failed", error);
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

export async function evaluatePracticeProposal(
  locale: Locale,
  conversationId: string,
  sourceMessageId: string,
  action: PracticeProposalEvaluationAction,
) {
  if (!isLocale(locale)) return { ok: false as const };
  const parsedAction = practiceProposalEvaluationActionSchema.safeParse(action);
  if (!parsedAction.success) return { ok: false as const };
  const user = await requireCurrentUser(locale);
  const result = await db.$transaction(async (transaction) => {
    const conversation = await transaction.conversation.findFirst({
      where: { id: conversationId, userId: user.id, mode: "INTEGRATE", status: "active", archivedAt: null },
      select: { focalMapItemId: true },
    });
    const source = await transaction.message.findFirst({
      where: { id: sourceMessageId, conversationId, role: "assistant", mode: "INTEGRATE" },
    });
    const latest = await transaction.message.findFirst({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    if (!conversation?.focalMapItemId || !source || latest?.id !== source.id) return null;
    const activePractice = await transaction.practice.findFirst({
      where: { userId: user.id, mapItemId: conversation.focalMapItemId, status: "ACTIVE" },
      select: { id: true },
    });
    if (activePractice) return null;
    const nextSignals = applyPracticeProposalEvaluation(source.internalSignals, parsedAction.data);
    if (!nextSignals) return null;
    await transaction.message.update({ where: { id: source.id }, data: { internalSignals: nextSignals } });
    return parsedAction.data;
  });
  return result ? { ok: true as const, action: result } : { ok: false as const };
}
