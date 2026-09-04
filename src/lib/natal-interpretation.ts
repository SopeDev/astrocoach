import { z } from "zod";
import type { LifeAreaKey } from "@/lib/life-areas";
import {
  ascendantInterpretationCatalog,
  getAscendantInterpretation,
} from "@/lib/ascendant-interpretations";
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

export const NATAL_INTERPRETATION_SCHEMA_VERSION = 1;
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
  kind: z.enum(["planet_placement", "ascendant", "lunar_node_axis"]),
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
    "nodal_axis",
    "house_axis",
    "birth_time_unknown",
  ])),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
  interpretation: interpretationMaterialSchema,
}).strict();

export const chartThemeSchema = z.object({
  id: z.string().regex(/^theme\.[1-5]$/),
  title: z.string().trim().min(3).max(90),
  synthesis: z.string().trim().min(20).max(900),
  possibleExpressions: z.array(z.string().trim().min(3).max(260)).min(1).max(3),
  supportingFactorIds: z.array(z.string().trim().min(1)).min(1).max(4),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1).max(10),
  uncertainty: z.boolean(),
}).strict();

const catalogVersionsSchema = z.object({
  ascendants: z.number().int().positive(),
  planetArchetypes: z.number().int().positive(),
  signArchetypes: z.number().int().positive(),
  houseArchetypes: z.number().int().positive(),
  planetSigns: z.number().int().positive(),
  planetHouses: z.number().int().positive(),
  lunarNodes: z.number().int().positive(),
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
    themes: z.array(chartThemeSchema).min(3).max(5),
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
  }).strict(),
  uncertainty: uncertaintySchema.nullable(),
  themes: z.array(chartThemeSchema).max(3),
  factors: z.array(rankedNatalFactorSchema).max(6),
}).strict();

export type RankedNatalFactor = z.infer<typeof rankedNatalFactorSchema>;
export type ChartTheme = z.infer<typeof chartThemeSchema>;
export type NatalInterpretationDocument = z.infer<typeof natalInterpretationDocumentSchema>;
export type NatalInterpretationRetrieval = z.infer<typeof natalInterpretationRetrievalSchema>;

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
        ...(planetHouse?.topics ?? []),
        ...planetArchetype.topics,
        ...signArchetype.topics,
        ...(houseArchetype?.topics ?? []),
      ]),
      rankingReasons,
      sourceReferences: [
        { catalog: "planet_signs", catalogVersion: planetSignInterpretationCatalog.version, entryId: planetSign.id },
        { catalog: "planet_archetypes", catalogVersion: planetArchetypeCatalog.version, entryId: planetArchetype.id },
        { catalog: "sign_archetypes", catalogVersion: signArchetypeCatalog.version, entryId: signArchetype.id },
        ...(planetHouse ? [{ catalog: "planet_houses" as const, catalogVersion: planetHouseInterpretationCatalog.version, entryId: planetHouse.id }] : []),
        ...(houseArchetype ? [{ catalog: "house_archetypes" as const, catalogVersion: houseArchetypeCatalog.version, entryId: houseArchetype.id }] : []),
      ],
      interpretation: {
        coreMeanings: [
          planetSign.interpretation.core_meaning,
          ...(planetHouse ? [planetHouse.interpretation.core_meaning] : []),
        ],
        possibleExpressions: [
          ...planetSign.interpretation.possible_expressions.slice(0, 2),
          ...(planetHouse?.interpretation.possible_expressions.slice(0, 2) ?? []),
        ],
        developmentalDirections: [
          planetSign.interpretation.developmental_direction,
          ...(planetHouse ? [planetHouse.interpretation.developmental_direction] : []),
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
  career: ["career", "vocation", "public_life", "work", "authority", "achievement", "purpose"],
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
  const rankedThemes = document.chartAtAGlance.themes
    .map((theme, index) => ({ theme, index, relevance: relevanceFor(theme.topics) }))
    .sort((left, right) => right.relevance - left.relevance || left.index - right.index);
  const relevantThemes = rankedThemes.filter((candidate) => candidate.relevance > 0);
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
    selection: { reason: options.reason, topics },
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

export function deterministicThemeFallback(
  rankedFactors: RankedNatalFactor[],
  timeAccuracy: string,
): ChartTheme[] {
  const targetCount = rankedFactors.length >= 8 ? 5 : rankedFactors.length >= 5 ? 4 : 3;
  const usableFactors = rankedFactors.slice(0, Math.max(targetCount * 2, targetCount));

  return Array.from({ length: targetCount }, (_, index) => {
    const first = usableFactors[index % usableFactors.length];
    const second = usableFactors[index + targetCount];
    const supporting = unique([first.id, ...(second ? [second.id] : [])]);
    const topics = unique([...first.topics, ...(second?.topics ?? [])]).slice(0, 8);
    const labels = [first.label, ...(second ? [second.label] : [])];
    const possibleExpressions = unique([
      first.interpretation.possibleExpressions[0],
      ...(second ? [second.interpretation.possibleExpressions[0]] : []),
    ]).slice(0, 3);

    return {
      id: `theme.${index + 1}`,
      title: titleFromTopics(topics),
      synthesis: `${labels.join(" and ")} form one of the chart's stronger symbolic threads. Together they place particular emphasis on ${topics.slice(0, 3).map((topic) => topic.replaceAll("_", " ")).join(", ")}; these are possible expressions to explore, not fixed traits or established biography.`,
      possibleExpressions,
      supportingFactorIds: supporting,
      topics,
      uncertainty: timeAccuracy === "unknown",
    } satisfies ChartTheme;
  });
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
