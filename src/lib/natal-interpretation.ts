import { z } from "zod";
import type { LifeAreaKey } from "@/lib/life-areas";
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

export const NATAL_INTERPRETATION_SCHEMA_VERSION = 3;
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
  kind: z.enum(["planet_placement", "ascendant", "midheaven", "lunar_node_axis"]),
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
    "aspect_emphasis",
    "ascendant",
    "midheaven",
    "nodal_axis",
    "house_axis",
    "birth_time_unknown",
  ])),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
  interpretation: interpretationMaterialSchema,
}).strict();

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
}).strict();

const uncertaintySchema = z.object({
  kind: z.literal("birth_time_unknown"),
  omittedFactors: z.array(z.enum(["ascendant", "houses", "aspects"])).length(3),
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
    strength: z.number().min(0).max(100),
  }).passthrough()).default([]),
  angles: z.record(z.string(), z.object({ sign: z.string() }).passthrough()).nullable().default(null),
  uncertainty: z.unknown().optional(),
}).passthrough();

const supportedPlanets = new Set<string>(PLANET_SIGN_PLANETS);
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

function aspectEmphasis(planet: PlanetSignPlanet, aspects: z.infer<typeof chartSchema>["aspects"]) {
  const strengths = aspects
    .filter((aspect) => aspect.body1 === planet || aspect.body2 === planet)
    .map((aspect) => aspect.strength)
    .filter((strength) => strength >= 40)
    .sort((a, b) => b - a)
    .slice(0, 3);
  return Math.min(10, Math.round(strengths.reduce((total, strength) => total + strength / 30, 0)));
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
    const aspectBonus = aspectEmphasis(planet, chart.aspects);
    const isChartRuler = chartRulers.includes(planet);
    const isAngular = house ? angularHouses.has(house) : false;
    const score = planetBaseScores[planet]
      + (isChartRuler ? (chartRulers.length === 1 ? 10 : 7) : 0)
      + (isAngular ? 8 : 0)
      + aspectBonus;
    const rankingReasons: RankedNatalFactor["rankingReasons"] = [planetClassReason(planet)];
    if (isChartRuler) rankingReasons.push("chart_ruler");
    if (isAngular) rankingReasons.push("angular_house");
    if (aspectBonus >= 4) rankingReasons.push("aspect_emphasis");
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
  const factors = (topics.length === 0
    ? rankedFactorCandidates
    : relevantFactorCandidates.length > 0 ? relevantFactorCandidates : rankedFactorCandidates)
    .slice(0, maxFactors)
    .map(({ factor }) => factor);

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

export function anchoredThemeFactorIds(
  rankedFactors: RankedNatalFactor[],
): Record<"identity" | "karmic" | "mission", string[]> {
  const sun = firstFactor(rankedFactors, (factor) => factor.id === "placement.sun");
  const moon = firstFactor(rankedFactors, (factor) => factor.id === "placement.moon");
  const saturn = firstFactor(rankedFactors, (factor) => factor.id === "placement.saturn");
  const ascendant = firstFactor(rankedFactors, (factor) => factor.kind === "ascendant");
  const midheaven = firstFactor(rankedFactors, (factor) => factor.kind === "midheaven");
  const nodes = firstFactor(rankedFactors, (factor) => factor.kind === "lunar_node_axis");

  return {
    identity: existingFactorIds([sun, ascendant ?? moon]),
    karmic: existingFactorIds([nodes, saturn, moon]),
    mission: existingFactorIds([nodes, midheaven, sun]),
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
  const possibilityNote = "These are symbolic possibilities to test against lived experience, not fixed traits or established biography.";

  return [
    buildTheme({
      id: "theme.identity",
      slot: "identity",
      title: "Identity and approach to life",
      synthesis: `${labels(factorsFor(anchors.identity))} anchor how identity, vitality, and the instinctive approach to life meet. Their interaction can describe both the center a person grows from and the way that center first enters experience. ${possibilityNote}`,
      spanish: {
        title: "Identidad y manera de entrar en la vida",
        synthesis: "Este tema reúne el centro de identidad, la vitalidad y la forma instintiva de acercarse a la experiencia. Puede describir tanto aquello desde lo que una persona crece como la manera en que ese centro se hace visible. Son posibilidades simbólicas para contrastar con la experiencia vivida, no rasgos fijos ni una biografía establecida.",
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
      title: "Familiar patterns and deeper work",
      synthesis: `${labels(factorsFor(anchors.karmic))} anchor a karmic and evolutionary lens on familiar emotional strategies, accumulated responsibilities, and the patterns growth repeatedly asks to make more conscious. ${possibilityNote}`,
      spanish: {
        title: "Patrones familiares y trabajo profundo",
        synthesis: "Este tema ofrece una mirada kármica y evolutiva sobre estrategias emocionales conocidas, responsabilidades acumuladas y patrones que el crecimiento invita a volver más conscientes. Son posibilidades simbólicas para contrastar con la experiencia vivida, no afirmaciones sobre vidas pasadas ni un destino fijo.",
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
      title: "Direction and contribution",
      synthesis: `${labels(factorsFor(anchors.mission))} anchor a developmental direction: what draws life forward, how purpose seeks expression, and where that movement may become visible through contribution. ${possibilityNote}`,
      spanish: {
        title: "Dirección y contribución",
        synthesis: "Este tema reúne una posible dirección de desarrollo: aquello que impulsa la vida hacia adelante, cómo busca expresarse el propósito y dónde ese movimiento podría hacerse visible como contribución. Son posibilidades simbólicas para explorar, no una profesión prometida ni un destino fijo.",
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
      synthesis: `${labels(emergentOne)} form a distinct secondary pattern in the chart, emphasizing how ${unique(emergentOne.flatMap((factor) => factor.topics)).slice(0, 3).map((topic) => topic.replaceAll("_", " ")).join(", ")} may interact. ${possibilityNote}`,
      spanish: {
        title: "Un patrón particular de tu carta",
        synthesis: "Estos factores forman un patrón secundario particular de la carta y señalan una posible interacción entre distintas necesidades, recursos o tensiones. Es una hipótesis simbólica para contrastar con la experiencia vivida, no un rasgo fijo.",
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
      synthesis: `${labels(emergentTwo)} reveal another chart-specific thread, drawing attention to possible tensions and resources around ${unique(emergentTwo.flatMap((factor) => factor.topics)).slice(0, 3).map((topic) => topic.replaceAll("_", " ")).join(", ")}. ${possibilityNote}`,
      spanish: {
        title: "Otro hilo importante de tu carta",
        synthesis: "Estos factores revelan otro hilo particular de la carta y llaman la atención sobre posibles tensiones y recursos que pueden operar juntos. Es una hipótesis simbólica para explorar, no una descripción definitiva de la persona.",
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
