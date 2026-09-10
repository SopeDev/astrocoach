import { z } from "zod";
import type { Locale } from "@/i18n/config";
import type {
  DiscoveryAstrologyContext,
  PersonalizedCurrentTransits,
} from "@/lib/discovery-astrology";
import type {
  ChartTheme,
  NatalInterpretationRetrieval,
  RankedNatalFactor,
} from "@/lib/natal-interpretation";

const chartPositionSchema = z.object({
  body: z.string().optional(),
  name: z.string().min(1),
  sign: z.string().min(1),
  house: z.number().int().min(1).max(12).optional(),
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
  second: z.number().int().min(0).max(59).optional(),
  retrograde: z.boolean().optional(),
}).passthrough();

const chartAspectSchema = z.object({
  body1: z.string().min(1),
  body2: z.string().min(1),
  type: z.string().min(1),
  deviation: z.number().nonnegative(),
  applying: z.boolean().nullable().optional(),
  outOfSign: z.boolean().optional(),
  timeReliability: z.enum(["stable_across_day", "time_sensitive"]).optional(),
}).passthrough();

const chartAngleSchema = z.object({
  name: z.string().min(1),
  sign: z.string().min(1),
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
  second: z.number().int().min(0).max(59).optional(),
}).passthrough();

const reasoningChartSourceSchema = z.object({
  planets: z.array(chartPositionSchema),
  nodes: z.array(chartPositionSchema.omit({ body: true, retrograde: true })),
  aspects: z.array(chartAspectSchema),
  angles: z.record(z.string(), chartAngleSchema).nullable(),
}).passthrough();

function round(value: number, digits: number) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function degree(position: { degree: number; minute: number; second?: number }) {
  return round(position.degree + position.minute / 60 + (position.second ?? 0) / 3600, 1);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function aspectId(body1: string, body2: string, type: string) {
  const [first, second] = [slug(body1), slug(body2)].sort();
  return `aspect.${first}.${type}.${second}`;
}

function positionLine(id: string, name: string, position: z.infer<typeof chartPositionSchema>) {
  return [
    id,
    `${name} ${position.sign} ${degree(position)}°`,
    position.house ? `H${position.house}` : null,
    position.retrograde ? "retrograde" : null,
  ].filter(Boolean).join(" | ");
}

function aspectLine(aspect: z.infer<typeof chartAspectSchema>) {
  const reliability = aspect.timeReliability === "stable_across_day" ? "stable across birth day" : null;
  const phase = aspect.applying === true ? "applying" : aspect.applying === false ? "separating" : null;
  return [
    aspectId(aspect.body1, aspect.body2, aspect.type),
    `${aspect.body1} ${aspect.type} ${aspect.body2}`,
    `${round(aspect.deviation, 2)}° orb`,
    phase,
    reliability,
    aspect.outOfSign ? "out of sign" : null,
  ].filter(Boolean).join(" | ");
}

export function reasoningNatalChart(value: unknown) {
  const chart = reasoningChartSourceSchema.parse(value);
  return {
    placements: chart.planets.map((planet) => positionLine(
      `placement.${slug(planet.name)}`,
      planet.name,
      planet,
    )),
    nodes: chart.nodes.map((node) => positionLine(
      `node.${slug(node.name)}`,
      node.name,
      node,
    )),
    angles: Object.entries(chart.angles ?? {}).map(([key, angle]) => [
      `angle.${slug(key)}`,
      `${angle.name} ${angle.sign} ${degree(angle)}°`,
    ].join(" | ")),
    aspects: chart.aspects
      .filter((aspect) => aspect.timeReliability !== "time_sensitive")
      .map(aspectLine),
  };
}

export function reasoningTheme(theme: ChartTheme, locale: Locale) {
  const presentation = locale === "es" ? theme.translations.es : theme;
  return {
    id: theme.id,
    title: presentation.title,
    synthesis: presentation.synthesis,
    expressions: presentation.possibleExpressions,
    factorIds: theme.supportingFactorIds,
  };
}

function factorFact(factor: RankedNatalFactor) {
  if (!factor.aspect) return factor.label;
  const phase = factor.aspect.applying === true
    ? "applying"
    : factor.aspect.applying === false ? "separating" : null;
  return [
    factor.label,
    `${round(factor.aspect.deviation, 2)}° orb`,
    phase,
    factor.aspect.timeReliability === "stable_across_day" ? "stable across birth day" : null,
    factor.aspect.outOfSign ? "out of sign" : null,
  ].filter(Boolean).join(" | ");
}

export function reasoningFactor(
  factor: RankedNatalFactor,
  { includeSignificance = false }: { includeSignificance?: boolean } = {},
) {
  return {
    id: factor.id,
    fact: factorFact(factor),
    ...(includeSignificance ? { significance: factor.score } : {}),
    interpretation: {
      meanings: factor.interpretation.coreMeanings,
      expressions: factor.interpretation.possibleExpressions,
      development: factor.interpretation.developmentalDirections,
    },
  };
}

export function reasoningCurrentTransits(
  transits: PersonalizedCurrentTransits,
  { includeActivations = false }: { includeActivations?: boolean } = {},
) {
  const positions = transits.snapshot.positions.map((position) => [
    position.body,
    `${position.sign} ${round(position.degree + position.minute / 60, 1)}°`,
    position.retrograde ? "retrograde" : null,
  ].filter(Boolean).join(" | "));
  const contacts = transits.activeAspects.map((aspect) => [
    aspect.id,
    `${aspect.transitingBody} ${aspect.aspectType} natal ${aspect.natalPoint}`,
    `${round(aspect.deviation, 2)}° orb`,
    aspect.phase,
    aspect.natalPositionReliability === "noon_reference" ? "natal position time-uncertain" : null,
    aspect.transitingBodyRetrograde ? "transiting body retrograde" : null,
    aspect.outOfSign ? "out of sign" : null,
  ].filter(Boolean).join(" | "));
  const activations = includeActivations
    ? Object.fromEntries(transits.natalAspectActivations.map((activation) => [
        activation.natalAspectId,
        {
          transitIds: activation.transitContactIds,
          ...(activation.bothEndpointsActivated ? { bothEnds: true } : {}),
        },
      ]))
    : undefined;

  return {
    asOf: transits.snapshot.calculatedAt,
    positions,
    contacts,
    ...(activations && Object.keys(activations).length > 0 ? { activations } : {}),
  };
}

export function reasoningDiscoveryAstrologyContext(
  context: DiscoveryAstrologyContext,
  locale: Locale,
) {
  return {
    evidenceStatus: context.evidenceStatus,
    natalTimeAccuracy: context.natalTimeAccuracy,
    chart: reasoningNatalChart(context.natalChart),
    themes: context.natalThemes.map((theme) => reasoningTheme(theme, locale)),
    transits: reasoningCurrentTransits({
      snapshot: {
        schemaVersion: 1,
        source: "shared_current_transit_snapshot",
        calculatedAt: context.calculatedAt,
        engine: context.engine,
        positions: context.currentTransits.positions,
      },
      activeAspects: context.currentTransits.activeAspects,
      natalAspectActivations: context.currentTransits.natalAspectActivations,
    }, { includeActivations: true }),
  };
}

export function reasoningInterpretationContext(
  context: NatalInterpretationRetrieval | null,
) {
  if (!context || context.factors.length === 0) return null;
  return {
    evidenceStatus: context.evidenceStatus,
    birthTimeUncertainty: context.uncertainty?.kind ?? null,
    factors: context.factors.map((factor) => reasoningFactor(factor)),
  };
}

export type ReasoningInterpretationContext = ReturnType<typeof reasoningInterpretationContext>;
