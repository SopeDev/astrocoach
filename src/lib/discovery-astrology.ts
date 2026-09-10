import {
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

export const DISCOVERY_ASTROLOGY_CONTEXT_VERSION = 2;
export const CURRENT_TRANSIT_SNAPSHOT_VERSION = 2;
export const CURRENT_TRANSIT_SNAPSHOT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const DISCOVERY_ASTROLOGY_REASONING_INSTRUCTIONS = `The private discoveryAstrologyContext is a frozen symbolic snapshot, not lived evidence. Inspect its complete reasoning-grade chart, all five themes, transits.positions, every transits.contacts entry, and the explicit transits.activations map before deciding what is most worth asking. Calculation inputs and redundant celestial geometry have already been removed by the server; do not infer that the chart is incomplete. Look for a coherent whole rather than listing placements or mechanically choosing the tightest orb. Give longer-running transits more interpretive weight than brief contacts, while allowing an exact fast transit to sharpen the timing of a larger natal or slow-transit story. A transit may suggest what is especially active now; it does not prove an event occurred or cause the person's circumstances.

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
const TRANSIT_BODY_DISPLAY_NAMES = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "North Node",
] as const;

const chartPlanetSchema = z.object({
  name: z.string().trim().min(1),
  sign: z.string().trim().min(1),
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
  house: z.number().int().min(1).max(12).optional(),
}).passthrough();

const chartNodeSchema = z.object({
  name: z.string().trim().min(1),
  sign: z.string().trim().min(1),
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
  house: z.number().int().min(1).max(12).optional(),
}).passthrough();

const chartAngleSchema = z.object({
  name: z.string().trim().min(1),
  sign: z.string().trim().min(1),
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
}).passthrough();

const natalChartSourceSchema = z.object({
  planets: z.array(chartPlanetSchema).min(1),
  nodes: z.array(chartNodeSchema),
  angles: z.record(z.string(), chartAngleSchema).nullable(),
}).passthrough();

export const currentTransitPositionSchema = z.object({
  body: z.enum(TRANSIT_BODY_DISPLAY_NAMES),
  retrograde: z.boolean(),
  stationary: z.boolean().default(false),
  sign: z.string().trim().min(1),
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
});

export const currentTransitSnapshotSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(CURRENT_TRANSIT_SNAPSHOT_VERSION)]),
  source: z.literal("shared_current_transit_snapshot"),
  calculatedAt: z.string().datetime(),
  engine: z.object({
    name: z.literal("celestine"),
    version: z.string().trim().min(1),
    transitAspectTypes: z.array(z.enum(MAJOR_ASPECT_TYPES)).length(5),
    transitingBodies: z.array(z.string().trim().min(1)).min(1),
  }).strict(),
  positions: z.array(currentTransitPositionSchema).length(DISCOVERY_TRANSIT_BODY_NAMES.length),
}).strict().superRefine((snapshot, context) => {
  const bodies = new Set(snapshot.positions.map((position) => position.body));
  if (bodies.size !== TRANSIT_BODY_DISPLAY_NAMES.length) {
    context.addIssue({
      code: "custom",
      path: ["positions"],
      message: "Current transit snapshot must contain each configured body exactly once",
    });
  }
});

export type CurrentTransitSnapshot = z.infer<typeof currentTransitSnapshotSchema>;

const activeTransitSchema = z.object({
  id: z.string().trim().min(1),
  transitingBody: z.string().trim().min(1),
  natalPointId: z.string().trim().min(1),
  natalPoint: z.string().trim().min(1),
  natalPositionReliability: z.enum(["exact_time", "noon_reference"]),
  aspectType: z.enum(MAJOR_ASPECT_TYPES),
  deviation: z.number().min(0),
  phase: z.enum(["applying", "exact", "separating"]),
});

const natalAspectActivationSchema = z.object({
  natalAspectId: z.string().trim().min(1),
  transitContactIds: z.array(z.string().trim().min(1)).min(1),
  bothEndpointsActivated: z.boolean(),
});

export const personalizedCurrentTransitsSchema = z.object({
  snapshot: currentTransitSnapshotSchema,
  activeAspects: z.array(activeTransitSchema),
  natalAspectActivations: z.array(natalAspectActivationSchema),
}).strict();

export type PersonalizedCurrentTransits = z.infer<typeof personalizedCurrentTransitsSchema>;

export const interpretationCurrentTransitsSchema = z.object({
  snapshot: z.object({
    calculatedAt: z.string().datetime(),
    positions: z.array(currentTransitPositionSchema),
  }).strict(),
  activeAspects: z.array(activeTransitSchema),
  natalAspectActivations: z.array(natalAspectActivationSchema),
}).strict();

export function interpretationCurrentTransits(transits: PersonalizedCurrentTransits) {
  return interpretationCurrentTransitsSchema.parse({
    snapshot: {
      calculatedAt: transits.snapshot.calculatedAt,
      positions: transits.snapshot.positions.map((position) => ({
        body: position.body,
        retrograde: position.retrograde,
        stationary: position.stationary,
        sign: position.sign,
        degree: position.degree,
        minute: position.minute,
      })),
    },
    activeAspects: transits.activeAspects.map((aspect) => ({
      id: aspect.id,
      transitingBody: aspect.transitingBody,
      natalPointId: aspect.natalPointId,
      natalPoint: aspect.natalPoint,
      natalPositionReliability: aspect.natalPositionReliability,
      aspectType: aspect.aspectType,
      deviation: aspect.deviation,
      phase: aspect.phase,
    })),
    natalAspectActivations: transits.natalAspectActivations.map((activation) => ({
      natalAspectId: activation.natalAspectId,
      transitContactIds: activation.transitContactIds,
      bothEndpointsActivated: activation.bothEndpointsActivated,
    })),
  });
}

export const discoveryAstrologyContextSchema = z.object({
  schemaVersion: z.literal(DISCOVERY_ASTROLOGY_CONTEXT_VERSION),
  source: z.literal("discovery_astrology_context"),
  evidenceStatus: z.literal(NATAL_INTERPRETATION_EVIDENCE_STATUS),
  calculatedAt: z.string().datetime(),
  sourceChartInputHash: z.string().trim().min(1),
  natalTimeAccuracy: z.enum(["exact", "unknown"]),
  natalChart: z.json(),
  natalThemes: z.array(chartThemeSchema).length(5),
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

const SIGN_LONGITUDES: Record<string, number> = {
  Aries: 0,
  Taurus: 30,
  Gemini: 60,
  Cancer: 90,
  Leo: 120,
  Virgo: 150,
  Libra: 180,
  Scorpio: 210,
  Sagittarius: 240,
  Capricorn: 270,
  Aquarius: 300,
  Pisces: 330,
};

function zodiacLongitude(position: { sign: string; degree: number; minute: number }) {
  const signLongitude = SIGN_LONGITUDES[position.sign];
  if (signLongitude === undefined) throw new Error(`Unsupported zodiac sign ${position.sign}`);
  return signLongitude + position.degree + position.minute / 60;
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
      longitude: zodiacLongitude(planet),
      ...(planet.house ? { house: planet.house } : {}),
      natalPositionReliability,
    })),
    ...chart.nodes.map((node) => ({
      id: `node.${slug(node.name)}`,
      name: node.name,
      type: "node" as const,
      longitude: zodiacLongitude(node),
      ...(node.house ? { house: node.house } : {}),
      natalPositionReliability,
    })),
    ...Object.entries(chart.angles ?? {}).map(([key, angle]) => ({
      id: `angle.${slug(key)}`,
      name: angle.name,
      type: "angle" as const,
      longitude: zodiacLongitude(angle),
      natalPositionReliability: "exact_time" as const,
    })),
  ];
}

export function createCurrentTransitSnapshot({
  engineVersion,
  calculatedAt = new Date(),
}: {
  engineVersion: string;
  calculatedAt?: Date;
}): CurrentTransitSnapshot {
  const julianDate = dateToJulianDate(calculatedAt);
  const currentPositions = transits.getTransitingBodies(julianDate, DISCOVERY_TRANSIT_BODY_NAMES);

  return currentTransitSnapshotSchema.parse({
    schemaVersion: CURRENT_TRANSIT_SNAPSHOT_VERSION,
    source: "shared_current_transit_snapshot",
    calculatedAt: calculatedAt.toISOString(),
    engine: {
      name: "celestine",
      version: engineVersion,
      transitAspectTypes: [...MAJOR_ASPECT_TYPES],
      transitingBodies: [...DISCOVERY_TRANSIT_BODY_NAMES],
    },
    positions: currentPositions.map((position) => {
      const zodiac = eclipticToZodiac(position.longitude);
      return {
        body: position.name,
        retrograde: position.isRetrograde,
        stationary: Math.abs(position.longitudeSpeed) < 0.001,
        sign: zodiac.signName,
        degree: zodiac.degree,
        minute: zodiac.minute,
      };
    }),
  });
}

export function transitSnapshotIsFresh(
  snapshot: CurrentTransitSnapshot,
  now = new Date(),
  maxAgeMs = CURRENT_TRANSIT_SNAPSHOT_MAX_AGE_MS,
) {
  const age = now.getTime() - new Date(snapshot.calculatedAt).getTime();
  return age >= 0 && age < maxAgeMs;
}

const TRANSIT_ASPECT_ANGLES: Record<(typeof MAJOR_ASPECT_TYPES)[number], number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};
const TRANSIT_BASE_ORBS: Record<(typeof MAJOR_ASPECT_TYPES)[number], number> = {
  conjunction: 3,
  sextile: 1.5,
  square: 2,
  trine: 2,
  opposition: 3,
};
const SLOW_TRANSIT_BODIES = new Set(["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron"]);

function angularSeparation(left: number, right: number) {
  const difference = Math.abs(left - right) % 360;
  return Math.min(difference, 360 - difference);
}

function signedAngularDifference(left: number, right: number) {
  let difference = right - left;
  if (difference > 180) difference -= 360;
  if (difference < -180) difference += 360;
  return difference;
}

function effectiveTransitOrb(
  aspectType: (typeof MAJOR_ASPECT_TYPES)[number],
  point: NatalPoint,
  position: z.infer<typeof currentTransitPositionSchema>,
) {
  return TRANSIT_BASE_ORBS[aspectType]
    + Number(position.body === "Sun" || position.body === "Moon")
    + Number(point.type === "luminary")
    + Number(point.type === "angle")
    + Number(SLOW_TRANSIT_BODIES.has(position.body)) * 0.5;
}

function transitContact(
  point: NatalPoint,
  position: z.infer<typeof currentTransitPositionSchema>,
) {
  const transitLongitude = zodiacLongitude(position);
  const separation = angularSeparation(transitLongitude, point.longitude);
  const closest = MAJOR_ASPECT_TYPES
    .map((aspectType) => ({
      aspectType,
      deviation: Math.abs(separation - TRANSIT_ASPECT_ANGLES[aspectType]),
      orb: effectiveTransitOrb(aspectType, point, position),
    }))
    .find((candidate) => candidate.deviation <= candidate.orb);
  if (!closest) return null;
  const aspectAngle = TRANSIT_ASPECT_ANGLES[closest.aspectType];
  const isPastExact = separation > aspectAngle;
  let phase: "applying" | "exact" | "separating";
  if (closest.deviation <= 0.1 || position.stationary) {
    phase = "exact";
  } else if (position.retrograde) {
    if (aspectAngle === 0) {
      phase = signedAngularDifference(transitLongitude, point.longitude) < 0 ? "applying" : "separating";
    } else {
      phase = isPastExact ? "applying" : "separating";
    }
  } else if (aspectAngle === 0) {
    phase = signedAngularDifference(transitLongitude, point.longitude) > 0 ? "applying" : "separating";
  } else if (aspectAngle === 180) {
    phase = (separation < 180) === isPastExact ? "separating" : "applying";
  } else {
    phase = isPastExact ? "separating" : "applying";
  }
  return {
    aspectType: closest.aspectType,
    deviation: closest.deviation,
    phase,
  };
}

export function createPersonalizedCurrentTransits({
  natalChart,
  natalInterpretation,
  natalTimeAccuracy,
  transitSnapshot,
}: {
  natalChart: unknown;
  natalInterpretation: NatalInterpretationDocument;
  natalTimeAccuracy: "exact" | "unknown";
  transitSnapshot: CurrentTransitSnapshot;
}): PersonalizedCurrentTransits {
  const chart = natalChartSourceSchema.parse(natalChart);
  const snapshot = currentTransitSnapshotSchema.parse(transitSnapshot);
  const natalPoints = buildNatalPoints(chart, natalTimeAccuracy);
  const detectedTransits = natalPoints.flatMap((point) => snapshot.positions.flatMap((position) => {
    const contact = transitContact(point, position);
    return contact ? [{ point, position, ...contact }] : [];
  }));
  const natalAspectFactors = natalInterpretation.rankedFactors.filter(
    (factor) => factor.kind === "major_aspect" && factor.aspect,
  );
  const activeAspectCandidates = detectedTransits
    .map((transit) => {
      const activatedFactorIds = natalAspectFactors
        .filter((factor) => (
          factor.aspect?.body1 === transit.point.name || factor.aspect?.body2 === transit.point.name
        ))
        .map((factor) => factor.id);
      return {
        id: `transit.${slug(transit.position.body)}.${transit.aspectType}.${transit.point.id}`,
        transitingBody: transit.position.body,
        natalPointId: transit.point.id,
        natalPoint: transit.point.name,
        natalPositionReliability: transit.point.natalPositionReliability,
        aspectType: transit.aspectType,
        deviation: transit.deviation,
        phase: transit.phase,
        activatedFactorIds,
      };
    })
    .sort((left, right) => left.deviation - right.deviation || left.id.localeCompare(right.id));
  const natalAspectActivations = natalAspectFactors.flatMap((factor) => {
    const contacts = activeAspectCandidates.filter((transit) => transit.activatedFactorIds.includes(factor.id));
    if (contacts.length === 0 || !factor.aspect) return [];
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
      transitContactIds: contacts.map((transit) => transit.id),
      bothEndpointsActivated: sharedTransitingBodies.length > 0,
    }];
  }).sort((left, right) => (
    Number(right.bothEndpointsActivated) - Number(left.bothEndpointsActivated)
    || left.natalAspectId.localeCompare(right.natalAspectId)
  ));
  const activeAspects = activeAspectCandidates.map((aspect) => ({
    id: aspect.id,
    transitingBody: aspect.transitingBody,
    natalPointId: aspect.natalPointId,
    natalPoint: aspect.natalPoint,
    natalPositionReliability: aspect.natalPositionReliability,
    aspectType: aspect.aspectType,
    deviation: aspect.deviation,
    phase: aspect.phase,
  }));

  return personalizedCurrentTransitsSchema.parse({
    snapshot,
    activeAspects,
    natalAspectActivations,
  });
}

export function createDiscoveryAstrologyContext({
  natalChart,
  natalInterpretation,
  natalTimeAccuracy,
  engineVersion,
  calculatedAt = new Date(),
  transitSnapshot,
}: {
  natalChart: unknown;
  natalInterpretation: NatalInterpretationDocument;
  natalTimeAccuracy: "exact" | "unknown";
  engineVersion: string;
  calculatedAt?: Date;
  transitSnapshot?: CurrentTransitSnapshot;
}) {
  const resolvedTransitSnapshot = transitSnapshot ?? createCurrentTransitSnapshot({
    engineVersion,
    calculatedAt,
  });
  const personalizedTransits = createPersonalizedCurrentTransits({
    natalChart,
    natalInterpretation,
    natalTimeAccuracy,
    transitSnapshot: resolvedTransitSnapshot,
  });

  return discoveryAstrologyContextSchema.parse({
    schemaVersion: DISCOVERY_ASTROLOGY_CONTEXT_VERSION,
    source: "discovery_astrology_context",
    evidenceStatus: NATAL_INTERPRETATION_EVIDENCE_STATUS,
    calculatedAt: personalizedTransits.snapshot.calculatedAt,
    sourceChartInputHash: natalInterpretation.sourceChartInputHash,
    natalTimeAccuracy,
    natalChart,
    natalThemes: natalInterpretation.chartAtAGlance.themes,
    currentTransits: {
      positions: personalizedTransits.snapshot.positions,
      activeAspects: personalizedTransits.activeAspects,
      natalAspectActivations: personalizedTransits.natalAspectActivations,
    },
  });
}
