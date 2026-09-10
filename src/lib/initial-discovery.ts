import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Locale } from "@/i18n/config";
import { ASTROCOACH_VOICE_INSTRUCTIONS } from "@/lib/astrology-context";
import type { AstrologyFamiliarity, AstrologyStyle } from "@/lib/astrology-preferences";
import {
  reasoningDiscoveryAstrologyContext,
  reasoningNatalChart,
} from "@/lib/astrology-model-context";
import {
  DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS,
  type DiscoveryAstrologyContext,
} from "@/lib/discovery-astrology";
import { getServerEnv } from "@/lib/env";
import { recordGenerationUsage } from "@/lib/generation-usage";
import {
  assertHumanFirstAstrologyLanguage,
  DISCOVERY_QUESTION_STYLE_INSTRUCTIONS,
  HUMAN_FIRST_ASTROLOGY_INSTRUCTIONS,
  TechnicalAstrologyLanguageError,
} from "@/lib/human-first-astrology";

const generatedDiscoveryQuestionSchema = z.object({
  privateBasis: z.string().trim().min(3).max(500),
  question: z.string().trim().min(10).max(240),
}).strict();

const generatedInitialDiscoveryQuestionSchema = generatedDiscoveryQuestionSchema.extend({
  basisKind: z.enum(["user_context", "natal_pattern", "current_activation"]),
  supportingAstrologyIds: z.array(z.string().trim().min(1)).max(6),
}).strict();

const initialQuestionSetSchema = z.object({
  questions: z.array(generatedInitialDiscoveryQuestionSchema).length(3),
}).strict();

const generatedFinalDiscoveryQuestionSchema = generatedDiscoveryQuestionSchema.extend({
  userGrounding: z.string().trim().min(2).max(120),
}).strict();

const finalQuestionSetSchema = z.object({
  questions: z.array(generatedFinalDiscoveryQuestionSchema).length(2),
}).strict();

export const discoveryQuestionsSchema = z.array(z.string().min(10).max(240)).length(3);
export const finalDiscoveryQuestionsSchema = z.array(z.string().min(10).max(240)).length(2);
export const discoveryAnswersSchema = z.array(z.string().trim().min(1).max(2000)).length(3);
export const finalDiscoveryAnswersSchema = z.array(z.string().trim().min(1).max(2000)).length(2);

type DiscoveryContext = {
  userId: string;
  locale: Locale;
  areaLabels: string[];
  currentContext: string | null;
  discoveryAstrologyContext: DiscoveryAstrologyContext;
  astrologyFamiliarity: AstrologyFamiliarity;
  astrologyStyle: AstrologyStyle;
};

function sharedInstructions(locale: Locale) {
  return `Write in ${locale === "es" ? "Spanish" : "English"}.

${HUMAN_FIRST_ASTROLOGY_INSTRUCTIONS}

${DISCOVERY_QUESTION_STYLE_INSTRUCTIONS}

${DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS}

astrologyStyle and astrologyFamiliarity may influence the depth and directness of the private hypothesis, but never make technical astrology visible during Discovery. Put a brief account of the exact user detail or chart hypothesis used in privateBasis. privateBasis is never shown to the user.

${ASTROCOACH_VOICE_INSTRUCTIONS}`;
}

function fallbackInitialQuestions(locale: Locale, areas: string[], context: string | null) {
  const focus = areas.length === 1
    ? areas[0]
    : locale === "es" ? "varias partes de tu vida" : "several parts of your life";
  return locale === "es"
    ? [
        `Parece que ${focus} está ocupando bastante espacio en tu vida ahora. ¿Qué está pasando ahí?`,
        "A veces lo que más nos importa también es donde más cuesta decir claramente lo que queremos. ¿Te está pasando algo así?",
        context ? "Hay algo en lo que contaste que todavía parece abierto. ¿Qué parte te gustaría que entendiera mejor?" : "Puede que estés sosteniendo más de lo que muestras. ¿Dónde lo notas más últimamente?",
      ]
    : [
        `It sounds like ${focus} is taking up a fair amount of space in your life right now. What is going on there?`,
        "Sometimes the things we care about most are also where it is hardest to say what we want. Is anything like that happening for you?",
        context ? "Something in what you shared still feels open. What part would you most want me to understand better?" : "You may be carrying more than you let on. Where have you noticed that most lately?",
      ];
}

function fallbackFinalQuestions(locale: Locale, answers: string[]) {
  const firstAnswer = answers.find((answer) => answer.trim())?.trim();
  const excerpt = firstAnswer
    ? firstAnswer.replace(/[¿?]/g, "").split(/[.!;]/)[0].trim().split(/\s+/).slice(0, 14).join(" ")
    : null;
  return locale === "es"
    ? [
        excerpt
          ? `Cuando dices «${excerpt}», parece que ahí hay algo importante. ¿Qué es lo que más te pesa de eso?`
          : "Hay algo importante en lo que contaste que aún no terminamos de mirar. ¿Qué parte te pesa más?",
        "También quiero entender qué necesitas, no solo lo que estás resolviendo. ¿Qué cambio te haría sentir que esto va realmente en una mejor dirección?",
      ]
    : [
        excerpt
          ? `When you say “${excerpt},” it sounds like there is something important there. What feels hardest about it?`
          : "There is something important in what you shared that we have not quite looked at yet. What part weighs on you most?",
        "I also want to understand what you need, not only what you are handling. What change would make this feel like it is genuinely moving in a better direction?",
      ];
}

function validateGeneratedQuestions(questions: string[]) {
  assertHumanFirstAstrologyLanguage(questions);
  if (questions.some((question) => (question.match(/\?/g) ?? []).length !== 1)) {
    throw new Error("Each Discovery item must contain exactly one question");
  }
  return questions;
}

function validateInitialQuestionBasis(
  generated: z.infer<typeof initialQuestionSetSchema>["questions"],
  astrologyContext: DiscoveryAstrologyContext,
) {
  const astrologyQuestions = generated.filter(({ basisKind }) => basisKind !== "user_context");
  if (astrologyQuestions.length < 2) {
    throw new Error("At least two initial Discovery questions must test concrete astrological hypotheses");
  }
  if (!generated.some(({ basisKind }) => basisKind === "natal_pattern")) {
    throw new Error("At least one initial Discovery question must synthesize the natal chart");
  }
  if (
    astrologyContext.currentTransits.activeAspects.length > 0
    && !generated.some(({ basisKind }) => basisKind === "current_activation")
  ) {
    throw new Error("At least one initial Discovery question must test a current transit activation");
  }
  const natalIds = new Set([
    ...Object.values(reasoningNatalChart(astrologyContext.natalChart))
      .flat()
      .map((fact) => fact.split(" | ")[0]),
    ...astrologyContext.natalThemes.flatMap((theme) => [
      theme.id,
      ...theme.supportingFactorIds,
    ]),
  ]);
  const transitIds = new Set(astrologyContext.currentTransits.activeAspects.map(({ id }) => id));
  for (const item of generated) {
    if (item.basisKind === "natal_pattern" && !item.supportingAstrologyIds.some((id) => natalIds.has(id))) {
      throw new Error("Each natal-pattern question must cite a supplied natal theme or factor ID");
    }
    if (item.basisKind === "current_activation" && !item.supportingAstrologyIds.some((id) => transitIds.has(id))) {
      throw new Error("Each current-activation question must cite a supplied transit ID");
    }
  }
}

function normalizeGrounding(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[“”‘’'"¿?¡!.,;:—–-]/g, " ").replace(/\s+/g, " ").trim();
}

function validateFinalQuestionGrounding(
  generated: z.infer<typeof finalQuestionSetSchema>["questions"],
  answers: string[],
) {
  const answerText = normalizeGrounding(answers.join(" "));
  const seenGroundings = new Set<string>();
  const seenAnswers = new Set<number>();
  for (const item of generated) {
    const grounding = normalizeGrounding(item.userGrounding);
    const question = normalizeGrounding(item.question);
    const answerIndex = answers.findIndex((answer) => normalizeGrounding(answer).includes(grounding));
    if (grounding.length < 4 || !answerText.includes(grounding) || answerIndex < 0) {
      throw new Error("Each final Discovery question must cite an exact phrase from the user's answers");
    }
    if (!question.includes(grounding)) {
      throw new Error("Each final Discovery question must visibly use its user-grounding phrase");
    }
    if (seenGroundings.has(grounding) || seenAnswers.has(answerIndex)) {
      throw new Error("Final Discovery questions must use details from different user answers");
    }
    seenGroundings.add(grounding);
    seenAnswers.add(answerIndex);
  }
}

function retryInstruction(error: TechnicalAstrologyLanguageError) {
  return `\n\nYour previous visible copy used prohibited technical language (${error.terms.join(", ")}). Rewrite it entirely as ordinary lived experience. Do not merely remove a degree or aspect word while leaving a chart explanation behind.`;
}

export async function generateInitialDiscoveryQuestions(context: DiscoveryContext) {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) return fallbackInitialQuestions(context.locale, context.areaLabels, context.currentContext);

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const discoveryAstrologyContext = reasoningDiscoveryAstrologyContext(
      context.discoveryAstrologyContext,
      context.locale,
    );
    let correction = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await client.responses.parse({
        model: env.OPENAI_MODEL,
        store: false,
        instructions: `${sharedInstructions(context.locale)} Generate exactly three initial Discovery questions. Together they should form a broad, personalized first picture across different dimensions. Move from an easy entry point toward slightly deeper inquiry. Use basisKind natal_pattern for a question primarily shaped by the stable natal chart, current_activation for one materially shaped by the frozen transit snapshot, and user_context only when primarily grounded in selectedLifeAreas or currentContext. At least one item must use natal_pattern; when active transit aspects are supplied, at least one must use current_activation. For natal_pattern, supportingAstrologyIds must contain exact supplied theme, natal-point, or supporting-factor IDs. For current_activation, it must contain at least one exact supplied transit ID and may also name an activated natal-aspect ID. Use an empty array for user_context when no astrological source materially shaped it. Explain the synthesis briefly in privateBasis. The visible wording must describe only the human experience being explored. Do not ask for information already present in the user's context.${correction}`,
        input: JSON.stringify({ selectedLifeAreas: context.areaLabels, currentContext: context.currentContext, astrologyFamiliarity: context.astrologyFamiliarity, astrologyStyle: context.astrologyStyle, discoveryAstrologyContext }),
        text: { format: zodTextFormat(initialQuestionSetSchema, "initial_discovery_questions") },
      });
      await recordGenerationUsage(response, { userId: context.userId, operation: "DISCOVERY_INITIAL", attempt: attempt + 1 });

      if (!response.output_parsed) throw new Error("The model did not return initial discovery questions");
      const questions = response.output_parsed.questions.map(({ question }) => question);
      try {
        validateGeneratedQuestions(questions);
        validateInitialQuestionBasis(response.output_parsed.questions, context.discoveryAstrologyContext);
        return questions;
      } catch (error) {
        if (attempt === 0) {
          correction = error instanceof TechnicalAstrologyLanguageError
            ? retryInstruction(error)
            : `\n\nYour previous result failed this requirement: ${error instanceof Error ? error.message : "invalid question format"}. Regenerate all three items and follow the requirements exactly.`;
          continue;
        }
        throw error;
      }
    }
    throw new Error("The model did not return usable initial discovery questions");
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
  if (!env.OPENAI_API_KEY) return fallbackFinalQuestions(context.locale, context.initialAnswers);

  try {
    const exchanges = context.initialQuestions.map((question, index) => ({ question, answer: context.initialAnswers[index] }));
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const discoveryAstrologyContext = reasoningDiscoveryAstrologyContext(
      context.discoveryAstrologyContext,
      context.locale,
    );
    let correction = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await client.responses.parse({
        model: env.OPENAI_MODEL,
        store: false,
        instructions: `${sharedInstructions(context.locale)} Generate exactly two finalizing Discovery questions after examining the three initial exchanges alongside the same frozen natal-and-transit snapshot used for the opening stage. For each item, copy a short, meaningful, verbatim phrase from a different answer into userGrounding, and include that exact phrase naturally in the visible question. Choose words the person would recognize as their own; do not use punctuation from the source question as part of the phrase. Begin from that concrete detail, tension, or distinction, then ask what would most improve your understanding. These are attentive follow-ups, not generic extra questions or a new chart reading. Treat the answers as more authoritative than natal or transit symbolism: use the astrology to notice what remains unresolved, never to override what the person just told you. Do not repeat an answered question, summarize everything, or offer a list of roles or priorities to choose among.${correction}`,
        input: JSON.stringify({ selectedLifeAreas: context.areaLabels, currentContext: context.currentContext, initialExchanges: exchanges, astrologyFamiliarity: context.astrologyFamiliarity, astrologyStyle: context.astrologyStyle, discoveryAstrologyContext }),
        text: { format: zodTextFormat(finalQuestionSetSchema, "final_discovery_questions") },
      });
      await recordGenerationUsage(response, { userId: context.userId, operation: "DISCOVERY_FINAL", attempt: attempt + 1 });

      if (!response.output_parsed) throw new Error("The model did not return final discovery questions");
      const questions = response.output_parsed.questions.map(({ question }) => question);
      try {
        validateGeneratedQuestions(questions);
        validateFinalQuestionGrounding(response.output_parsed.questions, context.initialAnswers);
        return questions;
      } catch (error) {
        if (attempt === 0) {
          correction = error instanceof TechnicalAstrologyLanguageError
            ? retryInstruction(error)
            : `\n\nYour previous result failed this requirement: ${error instanceof Error ? error.message : "invalid grounding"}. Regenerate both items and follow the requirements exactly.`;
          continue;
        }
        throw error;
      }
    }
    throw new Error("The model did not return usable final discovery questions");
  } catch (error) {
    console.warn("Final discovery generation unavailable; using fallback questions", error instanceof Error ? error.message : error);
    return fallbackFinalQuestions(context.locale, context.initialAnswers);
  }
}
