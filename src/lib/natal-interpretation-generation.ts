import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { recordGenerationUsage } from "@/lib/generation-usage";
import {
  assertHumanFirstAstrologyLanguage,
  TechnicalAstrologyLanguageError,
} from "@/lib/human-first-astrology";
import { NATAL_THEME_GENERATION_INSTRUCTIONS } from "@/lib/natal-interpretation-prompt";
import {
  anchoredThemeFactorIds,
  buildNatalThemeGenerationInput,
  CURRENT_CATALOG_VERSIONS,
  deterministicThemeFallback,
  natalInterpretationDocumentSchema,
  NATAL_INTERPRETATION_EVIDENCE_STATUS,
  NATAL_INTERPRETATION_SCHEMA_VERSION,
  NATAL_INTERPRETATION_SOURCE,
  rankNatalChartFactors,
  type ChartTheme,
  type NatalInterpretationDocument,
  type RankedNatalFactor,
} from "@/lib/natal-interpretation";

const generatedThemePresentationSchema = z.object({
  title: z.string().trim().min(3).max(90),
  synthesis: z.string().trim().min(20).max(800),
  possibleExpressions: z.array(z.string().trim().min(3).max(260)).min(1).max(3),
}).strict();

const generatedThemeContentSchema = generatedThemePresentationSchema.extend({
  spanish: generatedThemePresentationSchema,
}).strict();

const generatedThemesSchema = z.object({
  anchored: z.object({
    identity: generatedThemeContentSchema,
    karmic: generatedThemeContentSchema,
    mission: generatedThemeContentSchema,
  }).strict(),
  emergent: z.array(generatedThemeContentSchema.extend({
    supportingFactorIds: z.array(z.string().trim().min(1)).min(1).max(4),
  }).strict()).length(2),
}).strict();

export type PreparedNatalInterpretation = {
  document: NatalInterpretationDocument;
  generationMethod: "model" | "deterministic_fallback";
  model: string | null;
};

function ensurePossibilityLanguage(synthesis: string, locale: "en" | "es") {
  const includesPossibility = locale === "es"
    ? /\b(posible|posibilidad|puede|podría|no (?:es |son )?(?:un |una )?(?:rasgo|descripción|destino) fijo)\b/i.test(synthesis)
    : /\b(possible|possibility|may|might|could|not (?:a )?fixed)\b/i.test(synthesis);
  if (includesPossibility) return synthesis;
  return locale === "es"
    ? synthesis + " Tómalo como algo para explorar, no como una descripción fija de quién eres."
    : synthesis + " Take this as something to explore, not a fixed description of who you are.";
}

function normalizeGeneratedThemes(
  generated: z.infer<typeof generatedThemesSchema>,
  factors: RankedNatalFactor[],
  timeAccuracy: string,
): ChartTheme[] {
  const factorMap = new Map(factors.map((factor) => [factor.id, factor]));
  const anchors = anchoredThemeFactorIds(factors);
  const anchoredIds = new Set([...anchors.identity, ...anchors.karmic, ...anchors.mission]);
  const emergentCandidateIds = new Set(
    factors.filter((factor) => !anchoredIds.has(factor.id)).map((factor) => factor.id),
  );
  const normalizeTheme = (
    theme: z.infer<typeof generatedThemeContentSchema>,
    id: ChartTheme["id"],
    slot: ChartTheme["slot"],
    supportingIds: string[],
  ) => {
    const supportingFactorIds = [...new Set(supportingIds)]
      .filter((id) => factorMap.has(id))
      .slice(0, 4);
    if (supportingFactorIds.length === 0) {
      throw new Error("Generated theme " + slot + " has no valid supporting factors");
    }
    const topics = [...new Set(
      supportingFactorIds.flatMap((id) => factorMap.get(id)?.topics ?? []),
    )].slice(0, 10);

    return {
      id,
      slot,
      title: theme.title,
      synthesis: ensurePossibilityLanguage(theme.synthesis, "en"),
      possibleExpressions: theme.possibleExpressions,
      supportingFactorIds,
      topics,
      uncertainty: timeAccuracy === "unknown",
      translations: {
        es: {
          title: theme.spanish.title,
          synthesis: ensurePossibilityLanguage(theme.spanish.synthesis, "es"),
          possibleExpressions: theme.spanish.possibleExpressions,
        },
      },
    } satisfies ChartTheme;
  };
  const emergentThemes = generated.emergent.map((theme, index) => {
    const supportingFactorIds = [...new Set(theme.supportingFactorIds)]
      .filter((id) => emergentCandidateIds.has(id));
    if (supportingFactorIds.length === 0) {
      throw new Error("Emergent theme " + (index + 1) + " has no valid emergent supporting factors");
    }
    return normalizeTheme(
      theme,
      index === 0 ? "theme.emergent.1" : "theme.emergent.2",
      index === 0 ? "emergent_1" : "emergent_2",
      supportingFactorIds,
    );
  });

  return [
    normalizeTheme(generated.anchored.identity, "theme.identity", "identity", anchors.identity),
    normalizeTheme(generated.anchored.karmic, "theme.karmic", "karmic", anchors.karmic),
    normalizeTheme(generated.anchored.mission, "theme.mission", "mission", anchors.mission),
    ...emergentThemes,
  ];
}

function validateHumanFacingThemeLanguage(
  generated: z.infer<typeof generatedThemesSchema>,
) {
  const anchored = Object.values(generated.anchored);
  const presentations = [...anchored, ...generated.emergent].flatMap((theme) => [
    theme,
    theme.spanish,
  ]);
  assertHumanFirstAstrologyLanguage(presentations.flatMap((presentation) => [
    presentation.title,
    presentation.synthesis,
    ...presentation.possibleExpressions,
  ]));
}

async function generateThemes(
  factors: RankedNatalFactor[],
  timeAccuracy: string,
  userId: string,
): Promise<{ themes: ChartTheme[]; generationMethod: PreparedNatalInterpretation["generationMethod"]; model: string | null }> {
  const env = getServerEnv();
  const fallback = () => ({
    themes: deterministicThemeFallback(factors, timeAccuracy),
    generationMethod: "deterministic_fallback" as const,
    model: null,
  });
  if (!env.OPENAI_API_KEY) return fallback();

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    let correction = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await client.responses.parse({
        model: env.OPENAI_MODEL,
        store: false,
        instructions: NATAL_THEME_GENERATION_INSTRUCTIONS + correction,
        input: JSON.stringify(buildNatalThemeGenerationInput(factors, timeAccuracy)),
        text: { format: zodTextFormat(generatedThemesSchema, "chart_at_a_glance") },
      });
      await recordGenerationUsage(response, { userId, operation: "NATAL_THEMES", attempt: attempt + 1 });

      if (!response.output_parsed) throw new Error("The model did not return chart themes");
      try {
        validateHumanFacingThemeLanguage(response.output_parsed);
        return {
          themes: normalizeGeneratedThemes(response.output_parsed, factors, timeAccuracy),
          generationMethod: "model",
          model: response.model,
        };
      } catch (error) {
        if (attempt === 0 && error instanceof TechnicalAstrologyLanguageError) {
          correction = `\n\nYour previous person-facing prose used prohibited technical language (${error.terms.join(", ")}). Rewrite every affected English and Spanish field as an ordinary human experience. Keep all exact technical facts only in supportingFactorIds.`;
          continue;
        }
        throw error;
      }
    }
    throw new Error("The model did not return usable chart themes");
  } catch (error) {
    console.warn("Chart-at-a-glance generation unavailable; using deterministic synthesis", error instanceof Error ? error.message : error);
    return fallback();
  }
}

export async function prepareNatalInterpretation({
  chart,
  inputHash,
  timeAccuracy,
  userId,
}: {
  chart: unknown;
  inputHash: string;
  timeAccuracy: string;
  userId: string;
}): Promise<PreparedNatalInterpretation> {
  const rankedFactors = rankNatalChartFactors(chart);
  if (rankedFactors.length === 0) throw new Error("No authored interpretations match the natal chart");
  const generated = await generateThemes(rankedFactors, timeAccuracy, userId);
  const uncertainty = timeAccuracy === "unknown"
    ? {
        kind: "birth_time_unknown" as const,
        omittedFactors: ["ascendant", "houses"] as const,
        note: "Birth time is unknown. Themes use noon-reference planet and lunar-node signs; Ascendant and houses are omitted. Major aspects are retained with day-based timing uncertainty.",
      }
    : null;
  const document = natalInterpretationDocumentSchema.parse({
    schemaVersion: NATAL_INTERPRETATION_SCHEMA_VERSION,
    language: "en",
    source: NATAL_INTERPRETATION_SOURCE,
    evidenceStatus: NATAL_INTERPRETATION_EVIDENCE_STATUS,
    sourceChartInputHash: inputHash,
    catalogVersions: CURRENT_CATALOG_VERSIONS,
    rankedFactors,
    chartAtAGlance: { themes: generated.themes, uncertainty },
  });

  return { document, generationMethod: generated.generationMethod, model: generated.model };
}
