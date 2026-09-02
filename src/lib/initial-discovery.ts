import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Locale } from "@/i18n/config";
import { getServerEnv } from "@/lib/env";

const questionSetSchema = z.object({
  questions: z.array(z.string().min(10).max(240)).min(3).max(5),
});

type ChartData = {
  planets?: Array<{ name?: string; sign?: string; house?: number }>;
  nodes?: Array<{ name?: string; sign?: string; house?: number }>;
  angles?: Record<string, { sign?: string }> | null;
  timeAccuracy?: string;
};

function chartSummary(chart: ChartData) {
  const planets = chart.planets?.map(({ name, sign, house }) => `${name}: ${sign}${house ? `, house ${house}` : ""}`).join("; ") ?? "Unavailable";
  const nodes = chart.nodes?.map(({ name, sign, house }) => `${name}: ${sign}${house ? `, house ${house}` : ""}`).join("; ") ?? "Unavailable";
  const angles = chart.angles ? Object.entries(chart.angles).map(([name, angle]) => `${name}: ${angle.sign}`).join("; ") : "Unavailable";
  return `Planets: ${planets}\nNodes: ${nodes}\nAngles: ${angles}`;
}

function fallbackQuestions(locale: Locale, areas: string[], context: string | null) {
  const focus = areas.join(", ");

  return locale === "es"
    ? [
        `¿Qué te gustaría comprender mejor sobre ${focus}?`,
        "¿Qué situación reciente hizo que esto se sintiera importante ahora?",
        context ? "De lo que compartiste, ¿qué parte te genera más incertidumbre o curiosidad?" : "¿Hay alguna experiencia concreta que te gustaría explorar primero?",
      ]
    : [
        `What would you most like to understand about ${focus}?`,
        "What recent situation made this feel important now?",
        context ? "Of what you shared, which part creates the most uncertainty or curiosity?" : "Is there a specific experience you would like to explore first?",
      ];
}

export async function generateDiscoveryQuestions({
  locale,
  areaLabels,
  currentContext,
  chart,
}: {
  locale: Locale;
  areaLabels: string[];
  currentContext: string | null;
  chart: ChartData;
}) {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    return fallbackQuestions(locale, areaLabels, currentContext);
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: env.OPENAI_MODEL,
    instructions: `You create initial discovery questions for AstroCoach. Return 3 to 5 concise, distinct questions in ${locale === "es" ? "Spanish" : "English"}. Use the selected life areas and current context as primary evidence. Use natal chart symbolism only to choose potentially useful lines of inquiry, never to assert personality, destiny, diagnosis, or hidden truth. Questions must test relevance against lived experience, remain nonjudgmental, and avoid mentioning placements or astrological jargon. Prefer concrete questions about recent experiences, wants, tensions, and uncertainty.`,
    input: `Selected areas: ${areaLabels.join(", ")}\nCurrent context: ${currentContext || "Not provided"}\n\nPrivate chart context:\n${chartSummary(chart)}`,
    text: { format: zodTextFormat(questionSetSchema, "initial_discovery_questions") },
  });

  if (!response.output_parsed) {
    throw new Error("The model did not return discovery questions");
  }

  return response.output_parsed.questions;
}
