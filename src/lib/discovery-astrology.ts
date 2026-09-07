import {
  AspectType,
  CelestialBody,
  eclipticToZodiac,
  time,
  transits,
  type NatalPoint,
} from "celestine";
import { z } from "zod";
import { MAJOR_ASPECT_TYPES } from "@/lib/aspect-interpretations";
import {
  chartThemeSchema,
  NATAL_INTERPRETATION_EVIDENCE_STATUS,
  type NatalInterpretationDocument,
} from "@/lib/natal-interpretation";

export const DISCOVERY_ASTROLOGY_CONTEXT_VERSION = 1;
export const DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS = `The private discoveryAstrologyContext is a frozen symbolic snapshot, not lived evidence. Inspect its complete natalChart, all five natalThemes, currentTransits.positions, every currentTransits.activeAspects entry, and the explicit currentTransits.natalAspectActivations before deciding what is most worth asking. Look for a coherent whole rather than listing placements or mechanically choosing the largest strength number. Give longer-running transits more interpretive weight than brief contacts, while allowing an exact fast transit to sharpen the timing of a larger natal or slow-transit story. A transit may suggest what is especially active now; it does not prove an event occurred or cause the person's circumstances.

When natalTimeAccuracy is unknown, angles and houses are absent and natal points are marked noon_reference. Treat contacts to those points as time-uncertain possibilities rather than exact personal timing, and prefer activations that remain coherent with stable natal aspects or slower-moving natal bodies.`;
export const DISCOVERY_TRANSIT_BODY_NAMES = [
  CelestialBody.Sun,
  CelestialBody.Moon,
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
  CelestialBody.Chiron,
  CelestialBody.NorthNode,
] as const;

const chartPlanetSchema = z.object({
  body: z.string().trim().min(1),
  name: z.string().trim().min(1),
  longitude: z.number().finite(),
  house: z.number().int().min(1).max(12).optional(),
}).passthrough();

const chartNodeSchema = z.object({
  name: z.string().trim().min(1),
  longitude: z.number().finite(),
  house: z.number().int().min(1).max(12).optional(),
}).passthrough();

const chartAngleSchema = z.object({
  name: z.string().trim().min(1),
  abbreviation: z.string().trim().min(1),
  longitude: z.number().finite(),
}).passthrough();

const natalChartSourceSchema = z.object({
  planets: z.array(chartPlanetSchema).min(1),
  nodes: z.array(chartNodeSchema),
  angles: z.record(z.string(), chartAngleSchema).nullable(),
}).passthrough();

const natalTransitPointSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z.enum(["planet", "luminary", "angle", "node", "asteroid"]),
  longitude: z.number().min(0).max(360),
  house: z.number().int().min(1).max(12).optional(),
  natalPositionReliability: z.enum(["exact_time", "noon_reference"]),
}).strict();

const currentTransitPositionSchema = z.object({
  body: z.string().trim().min(1),
  longitude: z.number().min(0).max(360),
  longitudeSpeed: z.number().finite(),
  retrograde: z.boolean(),
  sign: z.string().trim().min(1),
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
}).strict();

const activeTransitSchema = z.object({
  id: z.string().trim().min(1),
  transitingBody: z.string().trim().min(1),
  natalPointId: z.string().trim().min(1),
  natalPoint: z.string().trim().min(1),
  natalPositionReliability: z.enum(["exact_time", "noon_reference"]),
  aspectType: z.enum(MAJOR_ASPECT_TYPES),
  aspectAngle: z.number().min(0).max(180),
  separation: z.number().min(0).max(180),
  deviation: z.number().min(0),
  orb: z.number().positive(),
  phase: z.enum(["applying", "exact", "separating"]),
  strength: z.number().min(0).max(100),
  transitingBodyRetrograde: z.boolean(),
  outOfSign: z.boolean(),
  activatesNatalAspectIds: z.array(z.string().trim().min(1)),
}).strict();

const natalAspectActivationSchema = z.object({
  natalAspectId: z.string().trim().min(1),
  body1: z.string().trim().min(1),
  body2: z.string().trim().min(1),
  aspectType: z.enum(MAJOR_ASPECT_TYPES),
  transitContactIds: z.array(z.string().trim().min(1)).min(1),
  contactedNatalPointIds: z.array(z.string().trim().min(1)).min(1),
  sharedTransitingBodies: z.array(z.string().trim().min(1)),
  bothEndpointsActivated: z.boolean(),
  strongestContactStrength: z.number().min(0).max(100),
}).strict();

export const discoveryAstrologyContextSchema = z.object({
  schemaVersion: z.literal(DISCOVERY_ASTROLOGY_CONTEXT_VERSION),
  source: z.literal("discovery_astrology_context"),
  evidenceStatus: z.literal(NATAL_INTERPRETATION_EVIDENCE_STATUS),
  calculatedAt: z.string().datetime(),
  sourceChartInputHash: z.string().trim().min(1),
  natalTimeAccuracy: z.enum(["exact", "unknown"]),
  engine: z.object({
    name: z.literal("celestine"),
    version: z.string().trim().min(1),
    transitAspectTypes: z.array(z.enum(MAJOR_ASPECT_TYPES)).length(5),
    transitingBodies: z.array(z.string().trim().min(1)).min(1),
  }).strict(),
  natalChart: z.json(),
  natalThemes: z.array(chartThemeSchema).length(5),
  natalPoints: z.array(natalTransitPointSchema).min(1),
  currentTransits: z.object({
    positions: z.array(currentTransitPositionSchema).min(1),
    activeAspects: z.array(activeTransitSchema),
    natalAspectActivations: z.array(natalAspectActivationSchema),
  }).strict(),
}).strict();

export type DiscoveryAstrologyContext = z.infer<typeof discoveryAstrologyContextSchema>;

function slug(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function dateToJulianDate(value: Date) {
  return time.toJulianDate({
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
    hour: value.getUTCHours(),
    minute: value.getUTCMinutes(),
    second: value.getUTCSeconds() + value.getUTCMilliseconds() / 1000,
    timezone: 0,
  });
}

function natalPointType(name: string): NatalPoint["type"] {
  if (name === "Sun" || name === "Moon") return "luminary";
  if (name === "Chiron") return "asteroid";
  return "planet";
}

function buildNatalPoints(
  chart: z.infer<typeof natalChartSourceSchema>,
  timeAccuracy: "exact" | "unknown",
) {
  const natalPositionReliability = timeAccuracy === "exact" ? "exact_time" as const : "noon_reference" as const;
  return [
    ...chart.planets.map((planet) => ({
      id: `placement.${slug(planet.name)}`,
      name: planet.name,
      type: natalPointType(planet.name),
      longitude: planet.longitude,
      ...(planet.house ? { house: planet.house } : {}),
      natalPositionReliability,
    })),
    ...chart.nodes.map((node) => ({
      id: `node.${slug(node.name)}`,
      name: node.name,
      type: "node" as const,
      longitude: node.longitude,
      ...(node.house ? { house: node.house } : {}),
      natalPositionReliability,
    })),
    ...Object.entries(chart.angles ?? {}).map(([key, angle]) => ({
      id: `angle.${slug(key)}`,
      name: angle.name,
      type: "angle" as const,
      longitude: angle.longitude,
      natalPositionReliability: "exact_time" as const,
    })),
  ];
}

export function createDiscoveryAstrologyContext({
  natalChart,
  natalInterpretation,
  natalTimeAccuracy,
  engineVersion,
  calculatedAt = new Date(),
}: {
  natalChart: unknown;
  natalInterpretation: NatalInterpretationDocument;
  natalTimeAccuracy: "exact" | "unknown";
  engineVersion: string;
  calculatedAt?: Date;
}) {
  const chart = natalChartSourceSchema.parse(natalChart);
  const natalPoints = buildNatalPoints(chart, natalTimeAccuracy);
  const pointMap = new Map(natalPoints.map((point) => [point.id, point]));
  const julianDate = dateToJulianDate(calculatedAt);
  const currentPositions = transits.getTransitingBodies(julianDate, DISCOVERY_TRANSIT_BODY_NAMES);
  const transitResult = transits.calculateTransits(
    natalPoints.map((point): NatalPoint => ({
      name: point.id,
      longitude: point.longitude,
      type: point.type,
      ...("house" in point && point.house ? { house: point.house } : {}),
    })),
    julianDate,
    {
      aspectTypes: [
        AspectType.Conjunction,
        AspectType.Sextile,
        AspectType.Square,
        AspectType.Trine,
        AspectType.Opposition,
      ],
      transitingBodies: [...DISCOVERY_TRANSIT_BODY_NAMES],
      calculateExactTimes: false,
      includeHouseIngress: false,
      includeOutOfSign: true,
      minimumStrength: 0,
    },
  );
  const natalAspectFactors = natalInterpretation.rankedFactors.filter(
    (factor) => factor.kind === "major_aspect" && factor.aspect,
  );
  const activeAspects = transitResult.transits
    .map((transit) => {
      const point = pointMap.get(transit.natalPoint);
      if (!point) throw new Error(`Transit references unknown natal point ${transit.natalPoint}`);
      const activatesNatalAspectIds = natalAspectFactors
        .filter((factor) => (
          factor.aspect?.body1 === point.name || factor.aspect?.body2 === point.name
        ))
        .map((factor) => factor.id);
      return {
        id: `transit.${slug(transit.transitingBody)}.${transit.aspectType}.${point.id}`,
        transitingBody: transit.transitingBody,
        natalPointId: point.id,
        natalPoint: point.name,
        natalPositionReliability: point.natalPositionReliability,
        aspectType: transit.aspectType,
        aspectAngle: transit.aspectAngle,
        separation: transit.separation,
        deviation: transit.deviation,
        orb: transit.orb,
        phase: transit.phase,
        strength: transit.strength,
        transitingBodyRetrograde: transit.isRetrograde,
        outOfSign: transit.isOutOfSign,
        activatesNatalAspectIds,
      };
    })
    .sort((left, right) => right.strength - left.strength || left.id.localeCompare(right.id));
  const natalAspectActivations = natalAspectFactors.flatMap((factor) => {
    const contacts = activeAspects.filter((transit) => transit.activatesNatalAspectIds.includes(factor.id));
    if (contacts.length === 0 || !factor.aspect) return [];
    const contactedNatalPointIds = [...new Set(contacts.map((transit) => transit.natalPointId))];
    const body1Transits = new Set(contacts
      .filter((transit) => transit.natalPoint === factor.aspect?.body1)
      .map((transit) => transit.transitingBody));
    const body2Transits = new Set(contacts
      .filter((transit) => transit.natalPoint === factor.aspect?.body2)
      .map((transit) => transit.transitingBody));
    const sharedTransitingBodies = [...body1Transits]
      .filter((body) => body2Transits.has(body))
      .sort();
    return [{
      natalAspectId: factor.id,
      body1: factor.aspect.body1,
      body2: factor.aspect.body2,
      aspectType: factor.aspect.type,
      transitContactIds: contacts.map((transit) => transit.id),
      contactedNatalPointIds,
      sharedTransitingBodies,
      bothEndpointsActivated: sharedTransitingBodies.length > 0,
      strongestContactStrength: Math.max(...contacts.map((transit) => transit.strength)),
    }];
  }).sort((left, right) => (
    Number(right.bothEndpointsActivated) - Number(left.bothEndpointsActivated)
    || right.strongestContactStrength - left.strongestContactStrength
    || left.natalAspectId.localeCompare(right.natalAspectId)
  ));

  return discoveryAstrologyContextSchema.parse({
    schemaVersion: DISCOVERY_ASTROLOGY_CONTEXT_VERSION,
    source: "discovery_astrology_context",
    evidenceStatus: NATAL_INTERPRETATION_EVIDENCE_STATUS,
    calculatedAt: calculatedAt.toISOString(),
    sourceChartInputHash: natalInterpretation.sourceChartInputHash,
    natalTimeAccuracy,
    engine: {
      name: "celestine",
      version: engineVersion,
      transitAspectTypes: [...MAJOR_ASPECT_TYPES],
      transitingBodies: [...DISCOVERY_TRANSIT_BODY_NAMES],
    },
    natalChart,
    natalThemes: natalInterpretation.chartAtAGlance.themes,
    natalPoints,
    currentTransits: {
      positions: currentPositions.map((position) => {
        const zodiac = eclipticToZodiac(position.longitude);
        return {
          body: position.name,
          longitude: position.longitude,
          longitudeSpeed: position.longitudeSpeed,
          retrograde: position.isRetrograde,
          sign: zodiac.signName,
          degree: zodiac.degree,
          minute: zodiac.minute,
        };
      }),
      activeAspects,
      natalAspectActivations,
    },
  });
}
