import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Locale } from "@/i18n/config";
import { ASTROLOGY_COMMUNICATION_INSTRUCTIONS } from "@/lib/astrology-context";
import type { AstrologyFamiliarity, AstrologyStyle } from "@/lib/astrology-preferences";
import { getServerEnv } from "@/lib/env";

const initialQuestionSetSchema = z.object({
  questions: z.array(z.string().min(10).max(240)).length(3),
});

const finalQuestionSetSchema = z.object({
  questions: z.array(z.string().min(10).max(240)).length(2),
});

export const discoveryQuestionsSchema = z.array(z.string().min(10).max(240)).length(3);
export const finalDiscoveryQuestionsSchema = z.array(z.string().min(10).max(240)).length(2);
export const discoveryAnswersSchema = z.array(z.string().trim().min(1).max(2000)).length(3);
export const finalDiscoveryAnswersSchema = z.array(z.string().trim().min(1).max(2000)).length(2);

export type DiscoveryChartData = {
  planets?: Array<{ name?: string; sign?: string; degree?: number; minute?: number; house?: number }>;
  nodes?: Array<{ name?: string; sign?: string; degree?: number; minute?: number; house?: number }>;
  aspects?: Array<{ body1?: string; body2?: string; type?: string; orb?: number; strength?: number }>;
  angles?: Record<string, { sign?: string; degree?: number; minute?: number }> | null;
  uncertainty?: unknown;
};

type DiscoveryContext = {
  locale: Locale;
  areaLabels: string[];
  currentContext: string | null;
  chart: DiscoveryChartData;
  astrologyFamiliarity: AstrologyFamiliarity;
  astrologyStyle: AstrologyStyle;
};

function chartSummary(chart: DiscoveryChartData) {
  return JSON.stringify({
    planets: chart.planets,
    nodes: chart.nodes,
    angles: chart.angles,
    aspects: chart.aspects?.slice(0, 20),
    uncertainty: chart.uncertainty,
  });
}

function sharedInstructions(locale: Locale) {
  return `Write in ${locale === "es" ? "Spanish" : "English"}. Questions must be concise, natural, nonjudgmental, meaningfully distinct, and presented according to the supplied astrologyStyle and astrologyFamiliarity. The preferences affect presentation only; chart symbolism should inform question selection at every style. Never assume a selected area is a problem, imply diagnosis, or state a chart-derived hypothesis as fact. Prefer concrete inquiry about recent experiences, wants, needs, expectations, tensions, and uncertainty. Do not create a Pattern, Insight, recommendation, Practice, or intervention.\n\n${ASTROLOGY_COMMUNICATION_INSTRUCTIONS}`;
}

function fallbackInitialQuestions(locale: Locale, areas: string[], context: string | null) {
  const focus = areas.join(", ");
  return locale === "es"
    ? [
        `¿Qué te gustaría comprender mejor sobre ${focus}?`,
        "¿Qué experiencia reciente hizo que estas áreas se sintieran importantes ahora?",
        context ? "De lo que compartiste, ¿qué parte te genera más incertidumbre o curiosidad?" : "¿Qué deseas o necesitas que todavía no has podido expresar con claridad?",
      ]
    : [
        `What would you most like to understand about ${focus}?`,
        "What recent experience made these areas feel important now?",
        context ? "Of what you shared, which part creates the most uncertainty or curiosity?" : "What do you want or need that you have not yet been able to express clearly?",
      ];
}

function fallbackFinalQuestions(locale: Locale) {
  return locale === "es"
    ? [
        "De todo lo que has descrito, ¿qué parte tendría que cambiar para que la situación se sintiera realmente diferente?",
        "¿Qué detalle importante podría cambiar la forma en que estás entendiendo lo que ocurre?",
      ]
    : [
        "Of everything you described, what would need to change for the situation to feel meaningfully different?",
        "What important detail might change how you understand what is happening?",
      ];
}

export async function generateInitialDiscoveryQuestions(context: DiscoveryContext) {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) return fallbackInitialQuestions(context.locale, context.areaLabels, context.currentContext);

  try {
    const response = await new OpenAI({ apiKey: env.OPENAI_API_KEY }).responses.parse({
      model: env.OPENAI_MODEL,
      instructions: `${sharedInstructions(context.locale)} Generate exactly three initial discovery questions. Together they should establish a broad but personalized first picture and cover different dimensions rather than variations of one theme. Move from accessible lived experience toward slightly deeper inquiry. Do not ask for information already present in the user's context. Chart symbolism may only help select hypotheses worth testing.`,
      input: JSON.stringify({ selectedLifeAreas: context.areaLabels, currentContext: context.currentContext, astrologyFamiliarity: context.astrologyFamiliarity, astrologyStyle: context.astrologyStyle, privateChartContext: JSON.parse(chartSummary(context.chart)) }),
      text: { format: zodTextFormat(initialQuestionSetSchema, "initial_discovery_questions") },
    });

    if (!response.output_parsed) throw new Error("The model did not return initial discovery questions");
    return response.output_parsed.questions;
  } catch (error) {
    console.warn("Initial discovery generation unavailable; using fallback questions", error instanceof Error ? error.message : error);
    return fallbackInitialQuestions(context.locale, context.areaLabels, context.currentContext);
  }
}

export async function generateFinalDiscoveryQuestions(context: DiscoveryContext & {
  initialQuestions: string[];
  initialAnswers: string[];
}) {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) return fallbackFinalQuestions(context.locale);

  try {
    const exchanges = context.initialQuestions.map((question, index) => ({ question, answer: context.initialAnswers[index] }));
    const response = await new OpenAI({ apiKey: env.OPENAI_API_KEY }).responses.parse({
      model: env.OPENAI_MODEL,
      instructions: `${sharedInstructions(context.locale)} Generate exactly two finalizing questions after examining the three initial exchanges. These are not generic extra questions. Identify the highest-value remaining uncertainties, contradictions, assumptions, competing explanations, or missing context. Treat the answers as more authoritative than chart symbolism. Do not repeat anything already answered. Prefer questions that distinguish between plausible understandings and materially improve the initial picture.`,
      input: JSON.stringify({ selectedLifeAreas: context.areaLabels, currentContext: context.currentContext, initialExchanges: exchanges, astrologyFamiliarity: context.astrologyFamiliarity, astrologyStyle: context.astrologyStyle, privateChartContext: JSON.parse(chartSummary(context.chart)) }),
      text: { format: zodTextFormat(finalQuestionSetSchema, "final_discovery_questions") },
    });

    if (!response.output_parsed) throw new Error("The model did not return final discovery questions");
    return response.output_parsed.questions;
  } catch (error) {
    console.warn("Final discovery generation unavailable; using fallback questions", error instanceof Error ? error.message : error);
    return fallbackFinalQuestions(context.locale);
  }
}
