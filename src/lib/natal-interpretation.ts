import { z } from "zod";
import type { LifeAreaKey } from "@/lib/life-areas";
import {
  aspectInterpretationCatalog,
  getAspectInterpretation,
  MAJOR_ASPECT_TYPES,
  type MajorAspectType,
} from "@/lib/aspect-interpretations";
import {
  ascendantInterpretationCatalog,
  getAscendantInterpretation,
} from "@/lib/ascendant-interpretations";
import {
  getKarmicPlanetSignInterpretation,
  karmicPlanetSignInterpretationCatalog,
} from "@/lib/karmic-planet-sign-interpretations";
import {
  getMidheavenInterpretation,
  midheavenInterpretationCatalog,
} from "@/lib/midheaven-interpretations";
import {
  getHouseArchetype,
  getPlanetArchetype,
  getSignArchetype,
  ARCHETYPE_PLANETS,
  houseArchetypeCatalog,
  planetArchetypeCatalog,
  signArchetypeCatalog,
  type ArchetypeHouse,
  type ArchetypePlanet,
  type ArchetypeSign,
} from "@/lib/archetype-interpretations";
import interpretations from "@/data/astrology/lunar-nodes.json";
import { lunarNodeInterpretationContext } from "@/lib/astrological-interpretations";
import {
  getPlanetHouseInterpretation,
  PLANET_HOUSE_HOUSES,
  planetHouseInterpretationCatalog,
  type PlanetHouseHouse,
  type PlanetHousePlanet,
} from "@/lib/planet-house-interpretations";
import {
  getPlanetSignInterpretation,
  PLANET_SIGN_PLANETS,
  PLANET_SIGN_SIGNS,
  planetSignInterpretationCatalog,
  type PlanetSignPlanet,
  type PlanetSignSign,
} from "@/lib/planet-sign-interpretations";

export const NATAL_INTERPRETATION_SCHEMA_VERSION = 6;
export const NATAL_INTERPRETATION_SOURCE = "natal_interpretation" as const;
export const NATAL_INTERPRETATION_EVIDENCE_STATUS = "symbolic_hypothesis_not_user_evidence" as const;

const sourceReferenceSchema = z.object({
  catalog: z.enum([
    "ascendants",
    "planet_archetypes",
    "sign_archetypes",
    "house_archetypes",
    "planet_signs",
    "planet_houses",
    "lunar_nodes",
    "karmic_planet_signs",
    "midheavens",
    "aspects",
  ]),
  catalogVersion: z.number().int().positive(),
  entryId: z.string().trim().min(1),
}).strict();

const interpretationMaterialSchema = z.object({
  coreMeanings: z.array(z.string().trim().min(1)).min(1),
  possibleExpressions: z.array(z.string().trim().min(1)).min(1).max(6),
  developmentalDirections: z.array(z.string().trim().min(1)).min(1).max(3),
}).strict();

export const rankedNatalFactorSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.enum(["planet_placement", "ascendant", "midheaven", "lunar_node_axis", "major_aspect"]),
  label: z.string().trim().min(1),
  score: z.number().int().nonnegative(),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1),
  rankingReasons: z.array(z.enum([
    "luminary",
    "personal_planet",
    "social_planet",
    "transpersonal_planet",
    "chart_ruler",
    "angular_house",
    "major_aspect",
    "tight_orb",
    "luminary_aspect",
    "personal_planet_aspect",
    "stable_across_day",
    "ascendant",
    "midheaven",
    "nodal_axis",
    "house_axis",
    "birth_time_unknown",
  ])),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
  interpretation: interpretationMaterialSchema,
  aspect: z.object({
    body1: z.string().trim().min(1),
    body2: z.string().trim().min(1),
    type: z.enum(MAJOR_ASPECT_TYPES),
    angle: z.number().min(0).max(180),
    separation: z.number().min(0).max(180),
    deviation: z.number().nonnegative(),
    orb: z.number().positive(),
    strength: z.number().min(0).max(100),
    applying: z.boolean().nullable(),
    outOfSign: z.boolean(),
    timeReliability: z.enum(["exact_time", "stable_across_day"]),
    referenceTimeMinutes: z.number().int().min(0).max(1439).optional(),
    sampleCoverage: z.object({
      present: z.number().int().positive(),
      total: z.number().int().positive(),
    }).strict().optional(),
    strengthRange: z.object({
      minimum: z.number().min(0).max(100),
      maximum: z.number().min(0).max(100),
    }).strict().optional(),
    deviationRange: z.object({
      minimum: z.number().nonnegative(),
      maximum: z.number().nonnegative(),
    }).strict().optional(),
  }).strict().optional(),
}).strict().superRefine((factor, context) => {
  if (factor.kind === "major_aspect" && !factor.aspect) {
    context.addIssue({
      code: "custom",
      path: ["aspect"],
      message: "Major aspect factors require exact aspect details",
    });
  }
  if (factor.kind !== "major_aspect" && factor.aspect) {
    context.addIssue({
      code: "custom",
      path: ["aspect"],
      message: "Only major aspect factors may contain aspect details",
    });
  }
});

const chartThemePresentationSchema = z.object({
  title: z.string().trim().min(3).max(90),
  synthesis: z.string().trim().min(20).max(900),
  possibleExpressions: z.array(z.string().trim().min(3).max(260)).min(1).max(3),
}).strict();

export const CHART_THEME_IDS = [
  "theme.identity",
  "theme.karmic",
  "theme.mission",
  "theme.emergent.1",
  "theme.emergent.2",
] as const;
export const chartThemeIdSchema = z.enum(CHART_THEME_IDS);

export const chartThemeSchema = chartThemePresentationSchema.extend({
  id: chartThemeIdSchema,
  slot: z.enum(["identity", "karmic", "mission", "emergent_1", "emergent_2"]),
  supportingFactorIds: z.array(z.string().trim().min(1)).min(1).max(4),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1).max(10),
  uncertainty: z.boolean(),
  translations: z.object({
    es: chartThemePresentationSchema,
  }).strict(),
}).strict();

const catalogVersionsSchema = z.object({
  ascendants: z.number().int().positive(),
  planetArchetypes: z.number().int().positive(),
  signArchetypes: z.number().int().positive(),
  houseArchetypes: z.number().int().positive(),
  planetSigns: z.number().int().positive(),
  planetHouses: z.number().int().positive(),
  lunarNodes: z.number().int().positive(),
  karmicPlanetSigns: z.number().int().positive(),
  midheavens: z.number().int().positive(),
  aspects: z.number().int().positive(),
}).strict();

const uncertaintySchema = z.object({
  kind: z.literal("birth_time_unknown"),
  omittedFactors: z.tuple([z.literal("ascendant"), z.literal("houses")]),
  note: z.string().trim().min(1),
}).strict();

export const natalInterpretationDocumentSchema = z.object({
  schemaVersion: z.literal(NATAL_INTERPRETATION_SCHEMA_VERSION),
  language: z.literal("en"),
  source: z.literal(NATAL_INTERPRETATION_SOURCE),
  evidenceStatus: z.literal(NATAL_INTERPRETATION_EVIDENCE_STATUS),
  sourceChartInputHash: z.string().trim().min(1),
  catalogVersions: catalogVersionsSchema,
  rankedFactors: z.array(rankedNatalFactorSchema).min(1),
  chartAtAGlance: z.object({
    themes: z.array(chartThemeSchema).length(5).superRefine((themes, context) => {
      const expectedSlots = ["identity", "karmic", "mission", "emergent_1", "emergent_2"];
      for (const [index, slot] of expectedSlots.entries()) {
        if (themes[index]?.slot !== slot) {
          context.addIssue({
            code: "custom",
            path: [index, "slot"],
            message: "Expected theme slot " + slot + " at position " + (index + 1),
          });
        }
      }
    }),
    uncertainty: uncertaintySchema.nullable(),
  }).strict(),
}).strict();

export const natalInterpretationRetrievalSchema = z.object({
  source: z.literal(NATAL_INTERPRETATION_SOURCE),
  evidenceStatus: z.literal(NATAL_INTERPRETATION_EVIDENCE_STATUS),
  schemaVersion: z.literal(NATAL_INTERPRETATION_SCHEMA_VERSION),
  selection: z.object({
    reason: z.enum(["initial_discovery", "conversation"]),
    topics: z.array(z.string()),
    preferredThemeId: chartThemeIdSchema.nullable(),
  }).strict(),
  uncertainty: uncertaintySchema.nullable(),
  themes: z.array(chartThemeSchema).max(3),
  factors: z.array(rankedNatalFactorSchema).max(6),
}).strict();

export type RankedNatalFactor = z.infer<typeof rankedNatalFactorSchema>;
export type ChartTheme = z.infer<typeof chartThemeSchema>;
export type ChartThemePresentation = z.infer<typeof chartThemePresentationSchema>;
export type NatalInterpretationDocument = z.infer<typeof natalInterpretationDocumentSchema>;
export type NatalInterpretationRetrieval = z.infer<typeof natalInterpretationRetrievalSchema>;

export const themeConversationStarterSchema = z.object({
  source: z.literal(NATAL_INTERPRETATION_SOURCE),
  evidenceStatus: z.literal(NATAL_INTERPRETATION_EVIDENCE_STATUS),
  themeId: chartThemeIdSchema,
}).strict();
export type ThemeConversationStarter = z.infer<typeof themeConversationStarterSchema>;

export function chartThemePresentation(
  theme: ChartTheme,
  locale: "en" | "es",
): ChartThemePresentation {
  if (locale === "es") return theme.translations.es;
  return {
    title: theme.title,
    synthesis: theme.synthesis,
    possibleExpressions: theme.possibleExpressions,
  };
}

const SPANISH_PLANETS: Record<string, string> = {
  Sun: "Sol",
  Moon: "Luna",
  Mercury: "Mercurio",
  Venus: "Venus",
  Mars: "Marte",
  Jupiter: "Júpiter",
  Saturn: "Saturno",
  Uranus: "Urano",
  Neptune: "Neptuno",
  Pluto: "Plutón",
  Chiron: "Quirón",
  "Mean North Node": "Nodo Norte medio",
};

const SPANISH_ASPECTS: Record<MajorAspectType, string> = {
  conjunction: "conjunción",
  sextile: "sextil",
  square: "cuadratura",
  trine: "trígono",
  opposition: "oposición",
};

const SPANISH_SIGNS: Record<string, string> = {
  Aries: "Aries",
  Taurus: "Tauro",
  Gemini: "Géminis",
  Cancer: "Cáncer",
  Leo: "Leo",
  Virgo: "Virgo",
  Libra: "Libra",
  Scorpio: "Escorpio",
  Sagittarius: "Sagitario",
  Capricorn: "Capricornio",
  Aquarius: "Acuario",
  Pisces: "Piscis",
};

export function natalFactorLabel(
  factor: Pick<RankedNatalFactor, "kind" | "label">,
  locale: "en" | "es",
) {
  if (locale === "en") return factor.label;

  const placement = /^(\w+) in (\w+)(?:, (\d+)(?:st|nd|rd|th) house)?$/.exec(factor.label);
  if (factor.kind === "planet_placement" && placement) {
    return [
      SPANISH_PLANETS[placement[1]] ?? placement[1],
      "en",
      SPANISH_SIGNS[placement[2]] ?? placement[2],
      ...(placement[3] ? [", casa " + placement[3]] : []),
    ].join(" ").replace(" ,", ",");
  }

  const ascendant = /^(\w+) Ascendant$/.exec(factor.label);
  if (factor.kind === "ascendant" && ascendant) {
    return "Ascendente en " + (SPANISH_SIGNS[ascendant[1]] ?? ascendant[1]);
  }

  const midheaven = /^(\w+) Midheaven$/.exec(factor.label);
  if (factor.kind === "midheaven" && midheaven) {
    return "Medio Cielo en " + (SPANISH_SIGNS[midheaven[1]] ?? midheaven[1]);
  }

  const nodes = /^North Node in (\w+) \/ South Node in (\w+)(?:, (\d+)(?:st|nd|rd|th)\/(\d+)(?:st|nd|rd|th) house axis)?$/.exec(factor.label);
  if (factor.kind === "lunar_node_axis" && nodes) {
    const signs = "Nodo Norte en " + (SPANISH_SIGNS[nodes[1]] ?? nodes[1])
      + " / Nodo Sur en " + (SPANISH_SIGNS[nodes[2]] ?? nodes[2]);
    return nodes[3] && nodes[4] ? signs + ", eje de casas " + nodes[3] + "/" + nodes[4] : signs;
  }

  const aspect = /^(.+) (conjunction|sextile|square|trine|opposition) (.+)$/.exec(factor.label);
  if (factor.kind === "major_aspect" && aspect) {
    return `${SPANISH_PLANETS[aspect[1]] ?? aspect[1]} ${SPANISH_ASPECTS[aspect[2] as MajorAspectType]} ${SPANISH_PLANETS[aspect[3]] ?? aspect[3]}`;
  }

  return factor.label;
}

const chartSchema = z.object({
  planets: z.array(z.object({
    name: z.string(),
    sign: z.string(),
    house: z.number().int().min(1).max(12).optional(),
  }).passthrough()).default([]),
  nodes: z.array(z.object({
    name: z.string(),
    sign: z.string(),
    house: z.number().int().min(1).max(12).optional(),
  }).passthrough()).default([]),
  aspects: z.array(z.object({
    body1: z.string(),
    body2: z.string(),
    type: z.enum(MAJOR_ASPECT_TYPES),
    angle: z.number().min(0).max(180),
    separation: z.number().min(0).max(180),
    deviation: z.number().nonnegative(),
    orb: z.number().positive(),
    strength: z.number().min(0).max(100),
    applying: z.boolean().nullable().optional(),
    outOfSign: z.boolean(),
    timeReliability: z.enum(["stable_across_day", "time_sensitive"]).optional(),
    referenceTimeMinutes: z.number().int().min(0).max(1439).optional(),
    sampleCoverage: z.object({
      present: z.number().int().positive(),
      total: z.number().int().positive(),
    }).strict().optional(),
    strengthRange: z.object({
      minimum: z.number().min(0).max(100),
      maximum: z.number().min(0).max(100),
    }).strict().optional(),
    deviationRange: z.object({
      minimum: z.number().nonnegative(),
      maximum: z.number().nonnegative(),
    }).strict().optional(),
  }).passthrough()).default([]),
  angles: z.record(z.string(), z.object({ sign: z.string() }).passthrough()).nullable().default(null),
  uncertainty: z.unknown().optional(),
}).passthrough();

const supportedPlanets = new Set<string>(PLANET_SIGN_PLANETS);
const supportedAspectPlanets = new Set<string>(ARCHETYPE_PLANETS);
const supportedSigns = new Set<string>(PLANET_SIGN_SIGNS);
const supportedHouses = new Set<number>(PLANET_HOUSE_HOUSES);
const angularHouses = new Set([1, 4, 7, 10]);

const planetBaseScores: Record<PlanetSignPlanet, number> = {
  Sun: 90,
  Moon: 88,
  Mercury: 72,
  Venus: 74,
  Mars: 74,
  Jupiter: 64,
  Saturn: 66,
  Uranus: 56,
  Neptune: 56,
  Pluto: 60,
};

const ascendantRulers: Record<PlanetSignSign, PlanetSignPlanet[]> = {
  Aries: ["Mars"],
  Taurus: ["Venus"],
  Gemini: ["Mercury"],
  Cancer: ["Moon"],
  Leo: ["Sun"],
  Virgo: ["Mercury"],
  Libra: ["Venus"],
  Scorpio: ["Mars", "Pluto"],
  Sagittarius: ["Jupiter"],
  Capricorn: ["Saturn"],
  Aquarius: ["Saturn", "Uranus"],
  Pisces: ["Jupiter", "Neptune"],
};

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function ordinal(house: number) {
  const names = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
  return names[house];
}

function planetClassReason(planet: PlanetSignPlanet): RankedNatalFactor["rankingReasons"][number] {
  if (planet === "Sun" || planet === "Moon") return "luminary";
  if (["Mercury", "Venus", "Mars"].includes(planet)) return "personal_planet";
  if (planet === "Jupiter" || planet === "Saturn") return "social_planet";
  return "transpersonal_planet";
}

function isNorthNode(body: string) {
  return body.toLowerCase().includes("north node");
}

function isSupportedAspectBody(body: string) {
  return supportedAspectPlanets.has(body) || isNorthNode(body);
}

function aspectBodySlug(body: string) {
  return body.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function aspectFactorId(body1: string, body2: string, type: MajorAspectType) {
  const [first, second] = [aspectBodySlug(body1), aspectBodySlug(body2)].sort();
  return `aspect.${first}.${type}.${second}`;
}

function aspectEndpointMaterial(body: string) {
  if (supportedAspectPlanets.has(body)) {
    const archetype = getPlanetArchetype(body as ArchetypePlanet);
    return {
      topics: archetype.topics,
      coreMeaning: archetype.interpretation.core_meaning,
      sourceReference: {
        catalog: "planet_archetypes" as const,
        catalogVersion: planetArchetypeCatalog.version,
        entryId: archetype.id,
      },
    };
  }

  return {
    topics: ["development", "purpose", "growth"],
    coreMeaning: "The North Node symbolizes a growth-oriented direction that may feel less familiar but can widen the range of conscious choice.",
    sourceReference: null,
  };
}

function aspectSignificanceScore(body1: string, body2: string, strength: number) {
  const bodies = [body1, body2];
  const luminaryCount = bodies.filter((body) => body === "Sun" || body === "Moon").length;
  const personalPlanetCount = bodies.filter((body) => ["Mercury", "Venus", "Mars"].includes(body)).length;
  const developmentalPointCount = bodies.filter((body) => body === "Chiron" || isNorthNode(body)).length;
  return Math.min(
    100,
    45 + Math.round(strength * 0.4) + luminaryCount * 6 + personalPlanetCount * 3 + developmentalPointCount * 2,
  );
}

export const CURRENT_CATALOG_VERSIONS = {
  ascendants: ascendantInterpretationCatalog.version,
  planetArchetypes: planetArchetypeCatalog.version,
  signArchetypes: signArchetypeCatalog.version,
  houseArchetypes: houseArchetypeCatalog.version,
  planetSigns: planetSignInterpretationCatalog.version,
  planetHouses: planetHouseInterpretationCatalog.version,
  lunarNodes: interpretations.version,
  karmicPlanetSigns: karmicPlanetSignInterpretationCatalog.version,
  midheavens: midheavenInterpretationCatalog.version,
  aspects: aspectInterpretationCatalog.version,
} as const;

export function rankNatalChartFactors(value: unknown): RankedNatalFactor[] {
  const parsed = chartSchema.safeParse(value);
  if (!parsed.success) return [];

  const chart = parsed.data;
  const ascendantSign = chart.angles?.ascendant?.sign;
  const hasAscendant = typeof ascendantSign === "string" && supportedSigns.has(ascendantSign);
  const chartRulers = hasAscendant ? ascendantRulers[ascendantSign as PlanetSignSign] : [];
  const factors: RankedNatalFactor[] = [];

  for (const placement of chart.planets) {
    if (!supportedPlanets.has(placement.name) || !supportedSigns.has(placement.sign)) continue;

    const planet = placement.name as PlanetSignPlanet;
    const sign = placement.sign as PlanetSignSign;
    const planetSign = getPlanetSignInterpretation(planet, sign);
    const karmicPlanetSign = planet === "Moon" || planet === "Saturn"
      ? getKarmicPlanetSignInterpretation(planet, sign)
      : null;
    const planetArchetype = getPlanetArchetype(planet as ArchetypePlanet);
    const signArchetype = getSignArchetype(sign as ArchetypeSign);
    const house = placement.house && supportedHouses.has(placement.house)
      ? placement.house as PlanetHouseHouse
      : null;
    const planetHouse = house
      ? getPlanetHouseInterpretation(planet as PlanetHousePlanet, house)
      : null;
    const houseArchetype = house ? getHouseArchetype(house as ArchetypeHouse) : null;
    const isChartRuler = chartRulers.includes(planet);
    const isAngular = house ? angularHouses.has(house) : false;
    const score = planetBaseScores[planet]
      + (isChartRuler ? (chartRulers.length === 1 ? 10 : 7) : 0)
      + (isAngular ? 8 : 0);
    const rankingReasons: RankedNatalFactor["rankingReasons"] = [planetClassReason(planet)];
    if (isChartRuler) rankingReasons.push("chart_ruler");
    if (isAngular) rankingReasons.push("angular_house");
    if (!house) rankingReasons.push("birth_time_unknown");

    factors.push({
      id: `placement.${planet.toLowerCase()}`,
      kind: "planet_placement",
      label: `${planet} in ${sign}${house ? `, ${ordinal(house)} house` : ""}`,
      score,
      topics: unique([
        ...planetSign.topics,
        ...(karmicPlanetSign?.topics ?? []),
        ...(planetHouse?.topics ?? []),
        ...planetArchetype.topics,
        ...signArchetype.topics,
        ...(houseArchetype?.topics ?? []),
      ]),
      rankingReasons,
      sourceReferences: [
        { catalog: "planet_signs", catalogVersion: planetSignInterpretationCatalog.version, entryId: planetSign.id },
        ...(karmicPlanetSign ? [{
          catalog: "karmic_planet_signs" as const,
          catalogVersion: karmicPlanetSignInterpretationCatalog.version,
          entryId: karmicPlanetSign.id,
        }] : []),
        { catalog: "planet_archetypes", catalogVersion: planetArchetypeCatalog.version, entryId: planetArchetype.id },
        { catalog: "sign_archetypes", catalogVersion: signArchetypeCatalog.version, entryId: signArchetype.id },
        ...(planetHouse ? [{ catalog: "planet_houses" as const, catalogVersion: planetHouseInterpretationCatalog.version, entryId: planetHouse.id }] : []),
        ...(houseArchetype ? [{ catalog: "house_archetypes" as const, catalogVersion: houseArchetypeCatalog.version, entryId: houseArchetype.id }] : []),
      ],
      interpretation: {
        coreMeanings: [
          planetSign.interpretation.core_meaning,
          ...(planetHouse ? [planetHouse.interpretation.core_meaning] : []),
          ...(karmicPlanetSign ? [karmicPlanetSign.interpretation.core_meaning] : []),
        ],
        possibleExpressions: [
          ...planetSign.interpretation.possible_expressions.slice(0, 2),
          ...(planetHouse?.interpretation.possible_expressions.slice(0, 2) ?? []),
          ...(karmicPlanetSign?.interpretation.possible_expressions.slice(0, 2) ?? []),
        ].slice(0, 6),
        developmentalDirections: [
          planetSign.interpretation.developmental_direction,
          ...(planetHouse ? [planetHouse.interpretation.developmental_direction] : []),
          ...(karmicPlanetSign ? [karmicPlanetSign.interpretation.developmental_direction] : []),
        ],
      },
    });
  }

  if (hasAscendant) {
    const sign = ascendantSign as PlanetSignSign;
    const ascendant = getAscendantInterpretation(sign);
    const signArchetype = getSignArchetype(sign as ArchetypeSign);
    factors.push({
      id: `ascendant.${sign.toLowerCase()}`,
      kind: "ascendant",
      label: `${sign} Ascendant`,
      score: 96,
      topics: unique([...ascendant.topics, ...signArchetype.topics]),
      rankingReasons: ["ascendant"],
      sourceReferences: [
        { catalog: "ascendants", catalogVersion: ascendantInterpretationCatalog.version, entryId: ascendant.id },
        { catalog: "sign_archetypes", catalogVersion: signArchetypeCatalog.version, entryId: signArchetype.id },
      ],
      interpretation: {
        coreMeanings: [ascendant.interpretation.core_meaning],
        possibleExpressions: ascendant.interpretation.possible_expressions,
        developmentalDirections: [ascendant.interpretation.developmental_direction],
      },
    });
  }

  const midheavenSign = chart.angles?.midheaven?.sign;
  if (typeof midheavenSign === "string" && supportedSigns.has(midheavenSign)) {
    const sign = midheavenSign as PlanetSignSign;
    const midheaven = getMidheavenInterpretation(sign);
    const signArchetype = getSignArchetype(sign as ArchetypeSign);
    factors.push({
      id: `midheaven.${sign.toLowerCase()}`,
      kind: "midheaven",
      label: `${sign} Midheaven`,
      score: 95,
      topics: unique([...midheaven.topics, ...signArchetype.topics]),
      rankingReasons: ["midheaven"],
      sourceReferences: [
        {
          catalog: "midheavens",
          catalogVersion: midheavenInterpretationCatalog.version,
          entryId: midheaven.id,
        },
        {
          catalog: "sign_archetypes",
          catalogVersion: signArchetypeCatalog.version,
          entryId: signArchetype.id,
        },
      ],
      interpretation: {
        coreMeanings: [midheaven.interpretation.core_meaning],
        possibleExpressions: midheaven.interpretation.possible_expressions,
        developmentalDirections: [midheaven.interpretation.developmental_direction],
      },
    });
  }

  const nodeContext = lunarNodeInterpretationContext(chart);
  if (nodeContext?.signAxis) {
    const north = nodeContext.signAxis.northNode;
    const south = nodeContext.signAxis.southNode;
    const northNode = chart.nodes.find((node) => node.name.toLowerCase().includes("north"));
    const southNode = chart.nodes.find((node) => node.name.toLowerCase().includes("south"));
    const northHouse = northNode?.house;
    const southHouse = southNode?.house;
    const signKey = `${north.toLowerCase()}_${south.toLowerCase()}`;
    const houseKey = northHouse && southHouse ? `house_${northHouse}_house_${southHouse}` : null;
    const northSign = supportedSigns.has(north) ? getSignArchetype(north as ArchetypeSign) : null;
    const southSign = supportedSigns.has(south) ? getSignArchetype(south as ArchetypeSign) : null;
    factors.push({
      id: `lunar_node_axis.${north.toLowerCase()}.${south.toLowerCase()}${northHouse && southHouse ? `.${northHouse}.${southHouse}` : ""}`,
      kind: "lunar_node_axis",
      label: `North Node in ${north} / South Node in ${south}${northHouse && southHouse ? `, ${ordinal(northHouse)}/${ordinal(southHouse)} house axis` : ""}`,
      score: nodeContext.houseAxis ? 94 : 88,
      topics: unique([
        "development",
        "familiar_patterns",
        "purpose",
        ...(northSign?.topics ?? []),
        ...(southSign?.topics ?? []),
        ...(northHouse && supportedHouses.has(northHouse) ? getHouseArchetype(northHouse as ArchetypeHouse).topics : []),
        ...(southHouse && supportedHouses.has(southHouse) ? getHouseArchetype(southHouse as ArchetypeHouse).topics : []),
      ]),
      rankingReasons: ["nodal_axis", ...(nodeContext.houseAxis ? ["house_axis" as const] : ["birth_time_unknown" as const])],
      sourceReferences: [
        { catalog: "lunar_nodes", catalogVersion: interpretations.version, entryId: `lunar_nodes.${signKey}` },
        ...(houseKey ? [{ catalog: "lunar_nodes" as const, catalogVersion: interpretations.version, entryId: `lunar_nodes_houses.${houseKey}` }] : []),
      ],
      interpretation: {
        coreMeanings: [
          nodeContext.signAxis.familiarPattern.summary,
          nodeContext.signAxis.developmentalDirection.summary,
          ...(nodeContext.houseAxis ? [nodeContext.houseAxis.familiarPattern.summary] : []),
        ],
        possibleExpressions: [
          ...nodeContext.signAxis.familiarPattern.possible_expressions.slice(0, 3),
          ...nodeContext.signAxis.developmentalDirection.growth_possibilities.slice(0, 2),
        ],
        developmentalDirections: [
          nodeContext.signAxis.developmentalDirection.summary,
          ...(nodeContext.houseAxis ? [nodeContext.houseAxis.developmentalDirection] : []),
        ],
      },
    });
  }

  for (const aspect of chart.aspects) {
    if (
      aspect.timeReliability === "time_sensitive"
      || !isSupportedAspectBody(aspect.body1)
      || !isSupportedAspectBody(aspect.body2)
    ) continue;

    const interpretation = getAspectInterpretation(aspect.type);
    const firstBody = aspectEndpointMaterial(aspect.body1);
    const secondBody = aspectEndpointMaterial(aspect.body2);
    const rankingReasons: RankedNatalFactor["rankingReasons"] = ["major_aspect"];
    if (aspect.strength >= 75) rankingReasons.push("tight_orb");
    if ([aspect.body1, aspect.body2].some((body) => body === "Sun" || body === "Moon")) {
      rankingReasons.push("luminary_aspect");
    }
    if ([aspect.body1, aspect.body2].some((body) => ["Mercury", "Venus", "Mars"].includes(body))) {
      rankingReasons.push("personal_planet_aspect");
    }
    if (aspect.timeReliability === "stable_across_day") {
      rankingReasons.push("stable_across_day", "birth_time_unknown");
    }

    factors.push({
      id: aspectFactorId(aspect.body1, aspect.body2, aspect.type),
      kind: "major_aspect",
      label: `${aspect.body1} ${aspect.type} ${aspect.body2}`,
      score: aspectSignificanceScore(aspect.body1, aspect.body2, aspect.strength),
      topics: unique([
        ...interpretation.topics,
        ...firstBody.topics,
        ...secondBody.topics,
      ]),
      rankingReasons,
      sourceReferences: [
        {
          catalog: "aspects",
          catalogVersion: aspectInterpretationCatalog.version,
          entryId: interpretation.id,
        },
        ...(firstBody.sourceReference ? [firstBody.sourceReference] : []),
        ...(secondBody.sourceReference ? [secondBody.sourceReference] : []),
      ],
      interpretation: {
        coreMeanings: [
          interpretation.interpretation.core_meaning,
          firstBody.coreMeaning,
          secondBody.coreMeaning,
        ],
        possibleExpressions: interpretation.interpretation.possible_expressions,
        developmentalDirections: [interpretation.interpretation.developmental_direction],
      },
      aspect: {
        body1: aspect.body1,
        body2: aspect.body2,
        type: aspect.type,
        angle: aspect.angle,
        separation: aspect.separation,
        deviation: aspect.deviation,
        orb: aspect.orb,
        strength: aspect.strength,
        applying: aspect.applying ?? null,
        outOfSign: aspect.outOfSign,
        timeReliability: aspect.timeReliability === "stable_across_day"
          ? "stable_across_day"
          : "exact_time",
        ...(aspect.referenceTimeMinutes === undefined ? {} : {
          referenceTimeMinutes: aspect.referenceTimeMinutes,
        }),
        ...(aspect.sampleCoverage ? { sampleCoverage: aspect.sampleCoverage } : {}),
        ...(aspect.strengthRange ? { strengthRange: aspect.strengthRange } : {}),
        ...(aspect.deviationRange ? { deviationRange: aspect.deviationRange } : {}),
      },
    });
  }

  return rankedNatalFactorSchema.array().parse(
    factors.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)),
  );
}

const LIFE_AREA_TOPICS: Record<LifeAreaKey, string[]> = {
  relationships: ["relationships", "partnership", "affection", "intimacy", "reciprocity", "commitment"],
  money: ["money", "resources", "values", "stability", "shared_resources", "self_worth"],
  career: ["career", "vocation", "public_life", "public_role", "work", "authority", "achievement", "purpose"],
  habits: ["habits", "routines", "daily_life", "work", "discipline", "skill"],
  emotions: ["emotions", "security", "memory", "care", "belonging", "inner_life", "vulnerability"],
  family: ["family", "home", "roots", "belonging", "care", "emotional_foundation"],
  confidence: ["confidence", "identity", "self_worth", "agency", "courage", "visibility", "self_expression"],
  spirituality: ["spirituality", "meaning", "beliefs", "inner_life", "compassion", "surrender", "purpose"],
  health: ["health", "routines", "embodiment", "daily_life", "care", "discipline"],
  selfUnderstanding: ["identity", "purpose", "transformation", "depth", "self_worth", "inner_life", "familiar_patterns"],
};

const TEXT_TOPIC_PATTERNS: Array<[RegExp, string[]]> = [
  [/\b(relationship|partner|dating|marriage|love|relaci[oó]n|pareja|amor)\b/i, LIFE_AREA_TOPICS.relationships],
  [/\b(money|income|debt|saving|financial|dinero|ingreso|deuda|ahorro|finanzas)\b/i, LIFE_AREA_TOPICS.money],
  [/\b(career|job|work|boss|profession|purpose|carrera|trabajo|jefe|profesi[oó]n|prop[oó]sito)\b/i, LIFE_AREA_TOPICS.career],
  [/\b(habit|routine|procrastinat|discipline|h[aá]bito|rutina|procrastin|disciplina)\b/i, LIFE_AREA_TOPICS.habits],
  [/\b(feel|emotion|anxious|sad|angry|sentir|emoci[oó]n|ansiedad|triste|enojo)\b/i, LIFE_AREA_TOPICS.emotions],
  [/\b(family|parent|mother|father|home|familia|madre|padre|hogar)\b/i, LIFE_AREA_TOPICS.family],
  [/\b(confiden|self-worth|insecure|autoestima|seguridad|insegur)\b/i, LIFE_AREA_TOPICS.confidence],
  [/\b(spiritual|faith|meaning|soul|espiritual|fe|sentido|alma)\b/i, LIFE_AREA_TOPICS.spirituality],
  [/\b(health|body|sleep|energy|salud|cuerpo|sueño|energ[ií]a)\b/i, LIFE_AREA_TOPICS.health],
  [/\b(identity|understand myself|who i am|identidad|entenderme|qui[eé]n soy)\b/i, LIFE_AREA_TOPICS.selfUnderstanding],
];

export function interpretationTopics(lifeAreas: LifeAreaKey[], text?: string | null) {
  const topics = lifeAreas.flatMap((area) => LIFE_AREA_TOPICS[area]);
  if (text) {
    for (const [pattern, matchedTopics] of TEXT_TOPIC_PATTERNS) {
      if (pattern.test(text)) topics.push(...matchedTopics);
    }
  }
  return unique(topics);
}

function overlapScore(candidateTopics: string[], selectedTopics: string[]) {
  const selected = new Set(selectedTopics);
  return candidateTopics.reduce((total, topic) => total + (selected.has(topic) ? 1 : 0), 0);
}

export function retrieveNatalInterpretation(
  value: unknown,
  options: {
    reason: "initial_discovery" | "conversation";
    lifeAreas: LifeAreaKey[];
    text?: string | null;
    maxThemes?: number;
    maxFactors?: number;
    preferredThemeId?: z.infer<typeof chartThemeIdSchema> | null;
  },
): NatalInterpretationRetrieval | null {
  const parsed = natalInterpretationDocumentSchema.safeParse(value);
  if (!parsed.success) return null;

  const document = parsed.data;
  const lifeAreaTopics = interpretationTopics(options.lifeAreas);
  const textTopics = interpretationTopics([], options.text);
  const topics = unique([...textTopics, ...lifeAreaTopics]);
  const relevanceFor = (candidateTopics: string[]) => (
    overlapScore(candidateTopics, textTopics) * 3
    + overlapScore(candidateTopics, lifeAreaTopics)
  );
  const maxThemes = Math.min(3, Math.max(0, options.maxThemes ?? 3));
  const maxFactors = Math.min(6, Math.max(0, options.maxFactors ?? 6));
  const preferredThemeId = options.preferredThemeId ?? null;
  const rankedThemes = document.chartAtAGlance.themes
    .map((theme, index) => ({
      theme,
      index,
      preferred: theme.id === preferredThemeId,
      relevance: relevanceFor(theme.topics),
    }))
    .sort((left, right) => {
      if (left.preferred !== right.preferred) return left.preferred ? -1 : 1;
      return right.relevance - left.relevance || left.index - right.index;
    });
  const relevantThemes = rankedThemes.filter(
    (candidate) => candidate.preferred || candidate.relevance > 0,
  );
  const themes = (topics.length === 0
    ? rankedThemes
    : relevantThemes.length > 0 ? relevantThemes : rankedThemes)
    .slice(0, maxThemes)
    .map(({ theme }) => theme);
  const supportingIds = themes.flatMap((theme) => theme.supportingFactorIds);
  const supportOrder = new Map(unique(supportingIds).map((id, index) => [id, index]));
  const rankedFactorCandidates = document.rankedFactors
    .map((factor, index) => ({
      factor,
      index,
      support: supportOrder.has(factor.id) ? supportOrder.get(factor.id)! : Number.MAX_SAFE_INTEGER,
      relevance: relevanceFor(factor.topics),
    }))
    .sort((left, right) => {
      const leftSupported = left.support !== Number.MAX_SAFE_INTEGER;
      const rightSupported = right.support !== Number.MAX_SAFE_INTEGER;
      if (leftSupported !== rightSupported) return leftSupported ? -1 : 1;
      if (left.support !== right.support) return left.support - right.support;
      return right.relevance - left.relevance || right.factor.score - left.factor.score || left.index - right.index;
    });
  const relevantFactorCandidates = rankedFactorCandidates.filter(
    (candidate) => candidate.support !== Number.MAX_SAFE_INTEGER || candidate.relevance > 0,
  );
  const selectedFactorCandidates = (topics.length === 0
    ? rankedFactorCandidates
    : relevantFactorCandidates.length > 0 ? relevantFactorCandidates : rankedFactorCandidates)
    .slice(0, maxFactors);
  if (
    topics.length > 0
    && selectedFactorCandidates.length > 0
    && !selectedFactorCandidates.some((candidate) => candidate.relevance > 0)
  ) {
    const mostRelevant = rankedFactorCandidates
      .filter((candidate) => candidate.relevance > 0)
      .sort((left, right) => (
        right.relevance - left.relevance
        || right.factor.score - left.factor.score
        || left.index - right.index
      ))[0];
    if (mostRelevant) selectedFactorCandidates[selectedFactorCandidates.length - 1] = mostRelevant;
  }
  const factors = unique(selectedFactorCandidates.map(({ factor }) => factor));

  return natalInterpretationRetrievalSchema.parse({
    source: NATAL_INTERPRETATION_SOURCE,
    evidenceStatus: NATAL_INTERPRETATION_EVIDENCE_STATUS,
    schemaVersion: NATAL_INTERPRETATION_SCHEMA_VERSION,
    selection: { reason: options.reason, topics, preferredThemeId },
    uncertainty: document.chartAtAGlance.uncertainty,
    themes,
    factors,
  });
}

function titleFromTopics(topics: string[]) {
  const labels = unique(topics)
    .slice(0, 2)
    .map((topic) => topic.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase()));
  return labels.join(" and ") || "A central chart theme";
}

export type ChartThemeSlot = ChartTheme["slot"];

function firstFactor(
  rankedFactors: RankedNatalFactor[],
  predicate: (factor: RankedNatalFactor) => boolean,
) {
  return rankedFactors.find(predicate);
}

function existingFactorIds(factors: Array<RankedNatalFactor | undefined>) {
  return unique(factors.filter((factor): factor is RankedNatalFactor => Boolean(factor))
    .map((factor) => factor.id));
}

function withRelatedAspects(
  rankedFactors: RankedNatalFactor[],
  baseFactorIds: string[],
  bodies: string[],
) {
  const bodySet = new Set(bodies);
  const relatedAspects = rankedFactors
    .filter((factor) => (
      factor.kind === "major_aspect"
      && factor.aspect
      && (bodySet.has(factor.aspect.body1) || bodySet.has(factor.aspect.body2))
    ))
    .sort((left, right) => {
      const leftBoth = left.aspect
        ? Number(bodySet.has(left.aspect.body1) && bodySet.has(left.aspect.body2))
        : 0;
      const rightBoth = right.aspect
        ? Number(bodySet.has(right.aspect.body1) && bodySet.has(right.aspect.body2))
        : 0;
      return rightBoth - leftBoth || right.score - left.score || left.id.localeCompare(right.id);
    })
    .map((factor) => factor.id);

  return unique([...baseFactorIds, ...relatedAspects]).slice(0, 4);
}

export function anchoredThemeFactorIds(
  rankedFactors: RankedNatalFactor[],
): Record<"identity" | "karmic" | "mission", string[]> {
  const sun = firstFactor(rankedFactors, (factor) => factor.id === "placement.sun");
  const moon = firstFactor(rankedFactors, (factor) => factor.id === "placement.moon");
  const saturn = firstFactor(rankedFactors, (factor) => factor.id === "placement.saturn");
  const ascendant = firstFactor(rankedFactors, (factor) => factor.kind === "ascendant");
  const midheaven = firstFactor(rankedFactors, (factor) => factor.kind === "midheaven");
  const nodes = firstFactor(rankedFactors, (factor) => factor.kind === "lunar_node_axis");

  const identityBase = existingFactorIds([sun, ascendant ?? moon]);
  const karmicBase = existingFactorIds([nodes, saturn, moon]);
  const missionBase = existingFactorIds([nodes, midheaven, sun]);
  const nodeBody = rankedFactors
    .filter((factor) => factor.kind === "major_aspect" && factor.aspect)
    .flatMap((factor) => [factor.aspect!.body1, factor.aspect!.body2])
    .find(isNorthNode) ?? "Mean North Node";

  return {
    identity: withRelatedAspects(
      rankedFactors,
      identityBase,
      ascendant ? ["Sun"] : ["Sun", "Moon"],
    ),
    karmic: withRelatedAspects(rankedFactors, karmicBase, [nodeBody, "Saturn", "Moon"]),
    mission: withRelatedAspects(rankedFactors, missionBase, [nodeBody, "Sun"]),
  };
}

export function buildNatalThemeGenerationInput(
  factors: RankedNatalFactor[],
  timeAccuracy: string,
) {
  const sourceFactor = (factor: RankedNatalFactor) => ({
    id: factor.id,
    label: factor.label,
    significanceScore: factor.score,
    rankingReasons: factor.rankingReasons,
    topics: factor.topics,
    authoredInterpretation: factor.interpretation,
    ...(factor.aspect ? { aspectDetails: factor.aspect } : {}),
  });
  const factorMap = new Map(factors.map((factor) => [factor.id, factor]));
  const anchors = anchoredThemeFactorIds(factors);
  const anchoredIds = new Set([...anchors.identity, ...anchors.karmic, ...anchors.mission]);
  const anchorInput = (slot: keyof typeof anchors, purpose: string) => ({
    slot,
    purpose,
    factors: anchors[slot]
      .map((id) => factorMap.get(id))
      .filter((factor): factor is RankedNatalFactor => Boolean(factor))
      .map(sourceFactor),
  });
  const nonAnchoredFactors = factors.filter((factor) => !anchoredIds.has(factor.id));
  const emergentCandidateFactors = [
    ...nonAnchoredFactors.filter((factor) => factor.kind !== "major_aspect").slice(0, 8),
    ...nonAnchoredFactors.filter((factor) => factor.kind === "major_aspect"),
  ]
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .map(sourceFactor);

  return {
    timeAccuracy,
    anchoredThemes: [
      anchorInput("identity", "Core identity and instinctive approach to life"),
      anchorInput("karmic", "Familiar emotional patterns, accumulated responsibilities, and evolutionary work"),
      anchorInput("mission", "Developmental direction, purpose, and public contribution"),
    ],
    emergentCandidateFactors,
  };
}

function buildTheme({
  id,
  slot,
  title,
  synthesis,
  spanish,
  factors,
  timeAccuracy,
}: {
  id: ChartTheme["id"];
  slot: ChartThemeSlot;
  title: string;
  synthesis: string;
  spanish: ChartThemePresentation;
  factors: RankedNatalFactor[];
  timeAccuracy: string;
}): ChartTheme {
  const topics = unique(factors.flatMap((factor) => factor.topics)).slice(0, 10);
  return {
    id,
    slot,
    title,
    synthesis,
    possibleExpressions: unique(
      factors.flatMap((factor) => factor.interpretation.possibleExpressions.slice(0, 1)),
    ).slice(0, 3),
    supportingFactorIds: factors.map((factor) => factor.id).slice(0, 4),
    topics,
    uncertainty: timeAccuracy === "unknown",
    translations: { es: spanish },
  };
}

export function deterministicThemeFallback(
  rankedFactors: RankedNatalFactor[],
  timeAccuracy: string,
): ChartTheme[] {
  const factorMap = new Map(rankedFactors.map((factor) => [factor.id, factor]));
  const anchors = anchoredThemeFactorIds(rankedFactors);
  const factorsFor = (ids: string[]) =>
    ids.map((id) => factorMap.get(id)).filter((factor): factor is RankedNatalFactor => Boolean(factor));
  const anchoredIds = new Set([...anchors.identity, ...anchors.karmic, ...anchors.mission]);
  const emergentPool = rankedFactors.filter((factor) => !anchoredIds.has(factor.id));
  const fallbackPool = emergentPool.length >= 4 ? emergentPool : rankedFactors;
  const emergentOne = unique([fallbackPool[0]?.id, fallbackPool[2]?.id].filter(Boolean))
    .map((id) => factorMap.get(id))
    .filter((factor): factor is RankedNatalFactor => Boolean(factor));
  const emergentTwo = unique([fallbackPool[1]?.id, fallbackPool[3]?.id].filter(Boolean))
    .map((id) => factorMap.get(id))
    .filter((factor): factor is RankedNatalFactor => Boolean(factor));
  const labels = (factors: RankedNatalFactor[]) => factors.map((factor) => factor.label).join(" and ");
  const possibilityNote = "Take this as a starting point to explore, not a fixed description of who you are.";

  return [
    buildTheme({
      id: "theme.identity",
      slot: "identity",
      title: "How you meet the world",
      synthesis: `${labels(factorsFor(anchors.identity))} bring together your inner sense of self and the way you first meet the world. You might notice places where those sides support each other—and places where they want different things. ${possibilityNote}`,
      spanish: {
        title: "Cómo te muestras al mundo",
        synthesis: "Este tema reúne tu sentido interno de quién eres y la manera en que te muestras al mundo. Podrías notar momentos en que ambas partes se apoyan y otros en que quieren cosas distintas. Tómalo como un punto de partida para explorar, no como una descripción fija de quién eres.",
        possibleExpressions: [
          "Reconocer qué parte de la identidad busca expresión",
          "Observar cómo la presencia exterior acompaña o contrasta con el centro personal",
        ],
      },
      factors: factorsFor(anchors.identity),
      timeAccuracy,
    }),
    buildTheme({
      id: "theme.karmic",
      slot: "karmic",
      title: "What feels familiar",
      synthesis: `${labels(factorsFor(anchors.karmic))} point toward emotional habits and responsibilities that may feel deeply familiar. Some can offer real strength, while others may keep you returning to the same response after it stops helping. ${possibilityNote}`,
      spanish: {
        title: "Lo que se siente familiar",
        synthesis: "Este tema señala hábitos emocionales y responsabilidades que podrían sentirse muy familiares. Algunos pueden darte una fuerza real; otros quizá te hagan volver a la misma respuesta cuando ya no te ayuda. Tómalo como algo para explorar, no como una afirmación sobre vidas pasadas ni un destino fijo.",
        possibleExpressions: [
          "Volver automáticamente a una estrategia emocional conocida",
          "Sentir que cierta responsabilidad pide una respuesta más consciente",
          "Descubrir una posibilidad de crecimiento dentro de un patrón repetido",
        ],
      },
      factors: factorsFor(anchors.karmic),
      timeAccuracy,
    }),
    buildTheme({
      id: "theme.mission",
      slot: "mission",
      title: "Where growth may lead",
      synthesis: `${labels(factorsFor(anchors.mission))} suggest qualities that may pull you toward growth and more meaningful contribution. The path may feel less familiar than what comes naturally, but it can reveal new ways to use what is already yours. ${possibilityNote}`,
      spanish: {
        title: "Hacia dónde podrías crecer",
        synthesis: "Este tema señala cualidades que podrían llevarte hacia el crecimiento y una contribución más significativa. El camino quizá se sienta menos familiar que aquello que te sale naturalmente, pero puede mostrarte nuevas formas de usar lo que ya tienes. Es algo para explorar, no una profesión prometida ni un destino fijo.",
        possibleExpressions: [
          "Sentirse llamado a desarrollar capacidades todavía poco familiares",
          "Buscar una forma de contribución que exprese el centro personal",
          "Revisar qué dirección produce crecimiento además de reconocimiento",
        ],
      },
      factors: factorsFor(anchors.mission),
      timeAccuracy,
    }),
    buildTheme({
      id: "theme.emergent.1",
      slot: "emergent_1",
      title: titleFromTopics(emergentOne.flatMap((factor) => factor.topics)),
      synthesis: `${labels(emergentOne)} connect around ${unique(emergentOne.flatMap((factor) => factor.topics)).slice(0, 3).map((topic) => topic.replaceAll("_", " ")).join(", ")}. You might recognize moments when these needs pull together or compete for your attention. ${possibilityNote}`,
      spanish: {
        title: "Una conexión en tu carta",
        synthesis: "Estos factores conectan distintas necesidades y recursos dentro de tu carta. Podrías reconocer momentos en que esas partes trabajan juntas y otros en que compiten por tu atención. Tómalo como algo para explorar, no como un rasgo fijo.",
        possibleExpressions: [
          "Notar que dos necesidades importantes se activan al mismo tiempo",
          "Encontrar un recurso inesperado dentro de una tensión recurrente",
        ],
      },
      factors: emergentOne,
      timeAccuracy,
    }),
    buildTheme({
      id: "theme.emergent.2",
      slot: "emergent_2",
      title: titleFromTopics(emergentTwo.flatMap((factor) => factor.topics)),
      synthesis: `${labels(emergentTwo)} connect around ${unique(emergentTwo.flatMap((factor) => factor.topics)).slice(0, 3).map((topic) => topic.replaceAll("_", " ")).join(", ")}. This may show up as a tension, but it can also become a useful strength when both sides have room. ${possibilityNote}`,
      spanish: {
        title: "Otra conexión importante",
        synthesis: "Estos factores conectan otra serie de necesidades y recursos dentro de tu carta. Podría sentirse como una tensión, pero también convertirse en una fortaleza cuando ambas partes tienen espacio. Tómalo como algo para explorar, no como una descripción definitiva de quién eres.",
        possibleExpressions: [
          "Reconocer una tensión que también contiene una capacidad útil",
          "Observar cómo dos impulsos distintos pueden aprender a colaborar",
        ],
      },
      factors: emergentTwo,
      timeAccuracy,
    }),
  ];
}

export function interpretationIsCurrent(value: unknown, inputHash: string) {
  const parsed = natalInterpretationDocumentSchema.safeParse(value);
  return parsed.success
    && parsed.data.sourceChartInputHash === inputHash
    && Object.entries(CURRENT_CATALOG_VERSIONS).every(
      ([catalog, version]) => parsed.data.catalogVersions[
        catalog as keyof typeof CURRENT_CATALOG_VERSIONS
      ] === version,
    );
}
