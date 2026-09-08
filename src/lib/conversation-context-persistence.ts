import "server-only";

import { z } from "zod";
import { db } from "@/db/client";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import {
  CONVERSATION_CONTEXT_VERSION,
  conversationContextSnapshotSchema,
  createConversationContextSnapshot,
  type ConversationContextSnapshot,
} from "@/lib/conversation-context";
import { createPersonalizedCurrentTransits } from "@/lib/discovery-astrology";
import { LIFE_AREA_KEYS, type LifeAreaKey } from "@/lib/life-areas";
import {
  calculateNatalChart,
  NATAL_ENGINE,
  NATAL_ENGINE_VERSION,
  NATAL_SCHEMA_VERSION,
} from "@/lib/natal-chart";
import { ensureNatalInterpretation } from "@/lib/natal-interpretation-persistence";
import {
  createProviderConversation,
  deleteProviderConversation,
} from "@/lib/openai-conversation-state";
import { getCurrentTransitSnapshot } from "@/lib/transit-snapshot-persistence";

type ConversationStart = {
  mode: "EXPLORE" | "RECOGNIZE" | "INTEGRATE" | "DEEP_EXPLORE";
  focalMapItemId: string | null;
};

function strings(value: unknown) {
  return z.array(z.string()).safeParse(value).data ?? [];
}

function onboardingExchanges(
  initialQuestions: unknown,
  initialAnswers: unknown,
  finalQuestions: unknown,
  finalAnswers: unknown,
) {
  const questions = [...strings(initialQuestions), ...strings(finalQuestions)];
  const answers = [...strings(initialAnswers), ...strings(finalAnswers)];
  return questions.map((question, index) => ({ question, answer: answers[index] ?? "" }));
}

export async function captureConversationContextSnapshot(
  userId: string,
  locale: Locale,
  start: ConversationStart,
): Promise<ConversationContextSnapshot> {
  const [intent, storedNatalChart, birthProfile, preferences, focalMapItem, activeMapItems] = await Promise.all([
    db.initialIntent.findUnique({ where: { userId } }),
    db.natalChart.findUnique({ where: { userId } }),
    db.birthProfile.findUnique({ where: { userId } }),
    db.user.findUnique({
      where: { id: userId },
      select: { astrologyFamiliarity: true, astrologyStyle: true },
    }),
    start.focalMapItemId
      ? db.mapItem.findFirst({
          where: { id: start.focalMapItemId, userId, archivedAt: null },
          select: { kind: true, statement: true },
        })
      : null,
    start.mode === "DEEP_EXPLORE"
      ? db.mapItem.findMany({
          where: { userId, archivedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 12,
          select: { id: true, kind: true, statement: true },
        })
      : [],
  ]);

  if (
    !intent?.discoveryCompletedAt
    || !storedNatalChart
    || !birthProfile
    || birthProfile.latitude === null
    || birthProfile.longitude === null
    || !birthProfile.timezoneId
    || !preferences
  ) {
    throw new Error("Completed conversation context is unavailable");
  }
  if (start.focalMapItemId && !focalMapItem) {
    throw new Error("Conversation focal Map item is unavailable");
  }

  let natalChart = storedNatalChart;
  if (storedNatalChart.schemaVersion !== NATAL_SCHEMA_VERSION) {
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

  const parsedTimeAccuracy = z.enum(["exact", "unknown"]).parse(natalChart.timeAccuracy);
  const lifeAreaKeys = intent.lifeAreas.flatMap((value) => {
    const key = z.enum(LIFE_AREA_KEYS).safeParse(value);
    return key.success ? [key.data as LifeAreaKey] : [];
  });
  const dictionary = getDictionary(locale);
  const [natalInterpretation, transitSnapshot] = await Promise.all([
    ensureNatalInterpretation(userId, natalChart),
    getCurrentTransitSnapshot(),
  ]);
  const currentTransits = createPersonalizedCurrentTransits({
    natalChart: natalChart.data,
    natalInterpretation,
    natalTimeAccuracy: parsedTimeAccuracy,
    transitSnapshot,
  });

  return createConversationContextSnapshot({
    localeAtStart: locale,
    birth: {
      date: birthProfile.birthDate.toISOString().slice(0, 10),
      timeMinutes: birthProfile.birthTimeMinutes,
      timeAccuracy: parsedTimeAccuracy,
      birthInstant: birthProfile.birthInstant?.toISOString() ?? null,
      utcOffsetMinutes: birthProfile.utcOffsetMinutes,
      location: {
        geonameId: birthProfile.geonameId,
        name: birthProfile.locationName,
        administrativeArea: birthProfile.adminName,
        country: birthProfile.countryName,
        countryCode: birthProfile.countryCode,
        latitude: Number(birthProfile.latitude),
        longitude: Number(birthProfile.longitude),
        timezoneId: birthProfile.timezoneId,
      },
    },
    natalChart: {
      engine: natalChart.engine,
      engineVersion: natalChart.engineVersion,
      schemaVersion: natalChart.schemaVersion,
      inputHash: natalChart.inputHash,
      timeAccuracy: parsedTimeAccuracy,
      houseSystem: natalChart.houseSystem,
      sourceProfileUpdatedAt: natalChart.sourceProfileUpdated.toISOString(),
      calculatedAt: natalChart.calculatedAt.toISOString(),
      data: z.json().parse(natalChart.data),
    },
    natalInterpretation,
    currentTransits,
    onboarding: {
      selectedLifeAreaKeys: lifeAreaKeys,
      selectedLifeAreas: lifeAreaKeys.map((key) => dictionary.initialIntent.areas[key]),
      initialDescription: intent.currentContext,
      exchanges: onboardingExchanges(
        intent.discoveryQuestions,
        intent.initialAnswers,
        intent.finalQuestions,
        intent.finalAnswers,
      ),
    },
    preferences,
    conversationStart: {
      mode: start.mode,
      focalMapItem: focalMapItem
        ? { kind: focalMapItem.kind, statement: focalMapItem.statement }
        : null,
      relatedMapItems: activeMapItems
        .filter((item) => item.id !== start.focalMapItemId)
        .map((item) => ({ kind: item.kind, statement: item.statement })),
    },
  });
}

export async function ensureConversationProviderState({
  userId,
  locale,
  conversationId,
  excludedMessageId,
}: {
  userId: string;
  locale: Locale;
  conversationId: string;
  excludedMessageId?: string;
}) {
  let conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId, archivedAt: null },
    select: {
      id: true,
      mode: true,
      focalMapItemId: true,
      contextSnapshot: true,
      contextVersion: true,
      providerConversationId: true,
    },
  });
  if (!conversation) throw new Error("Conversation is unavailable");

  let snapshot = conversationContextSnapshotSchema.safeParse(conversation.contextSnapshot).data;
  if (!snapshot) {
    const captured = await captureConversationContextSnapshot(userId, locale, {
      mode: conversation.mode,
      focalMapItemId: conversation.focalMapItemId,
    });
    await db.conversation.updateMany({
      where: { id: conversation.id, userId, contextVersion: null },
      data: {
        contextVersion: CONVERSATION_CONTEXT_VERSION,
        contextSnapshot: captured,
      },
    });
    conversation = await db.conversation.findFirst({
      where: { id: conversation.id, userId, archivedAt: null },
      select: {
        id: true,
        mode: true,
        focalMapItemId: true,
        contextSnapshot: true,
        contextVersion: true,
        providerConversationId: true,
      },
    });
    if (!conversation) throw new Error("Conversation is unavailable");
    snapshot = conversationContextSnapshotSchema.parse(conversation.contextSnapshot);
  }
  if (conversation.contextVersion !== snapshot.schemaVersion) {
    throw new Error("Conversation context version is inconsistent");
  }
  if (conversation.providerConversationId) {
    return { providerConversationId: conversation.providerConversationId, snapshot };
  }

  const history = await db.message.findMany({
    where: {
      conversationId,
      ...(excludedMessageId ? { id: { not: excludedMessageId } } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { role: true, content: true },
  });
  const providerConversationId = await createProviderConversation({
    appConversationId: conversationId,
    snapshot,
    history,
  });
  const initializedAt = new Date();
  const claimed = await db.conversation.updateMany({
    where: { id: conversationId, userId, providerConversationId: null },
    data: { providerConversationId, contextInitializedAt: initializedAt },
  });
  if (claimed.count === 1) return { providerConversationId, snapshot };

  try {
    await deleteProviderConversation(providerConversationId);
  } catch (error) {
    console.warn("Could not clean up an unused provider conversation", error);
  }
  const winner = await db.conversation.findFirst({
    where: { id: conversationId, userId, archivedAt: null },
    select: { providerConversationId: true },
  });
  if (!winner?.providerConversationId) throw new Error("Conversation provider state was not initialized");
  return { providerConversationId: winner.providerConversationId, snapshot };
}
