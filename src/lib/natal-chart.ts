import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { AspectType, calculateChart, type Aspect, type BirthData, type ChartPlanet } from "celestine";

export const NATAL_ENGINE = "celestine";
export const NATAL_ENGINE_VERSION = "0.2.1";
export const NATAL_SCHEMA_VERSION = 3;
export const NATAL_HOUSE_SYSTEM = "placidus" as const;
export const NATAL_NODE_METHOD = "mean" as const;
export const NATAL_INCLUDE_CHIRON = true;
export const NATAL_ASPECT_TYPES = [
  AspectType.Conjunction,
  AspectType.Sextile,
  AspectType.Square,
  AspectType.Trine,
  AspectType.Opposition,
] as const;
const UNKNOWN_TIME_ASPECT_SAMPLE_MINUTES = [
  0, 120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320, 1439,
] as const;

export type NatalCalculationInput = {
  birthDate: Date;
  birthTimeMinutes: number | null;
  latitude: number;
  longitude: number;
  timezoneId: string;
};

function chartBirthData(input: NatalCalculationInput, referenceTimeMinutes?: number): BirthData {
  const timeMinutes = referenceTimeMinutes ?? input.birthTimeMinutes ?? 12 * 60;
  const hour = Math.floor(timeMinutes / 60);
  const minute = timeMinutes % 60;
  const localTime = Temporal.ZonedDateTime.from({
    timeZone: input.timezoneId,
    year: input.birthDate.getUTCFullYear(),
    month: input.birthDate.getUTCMonth() + 1,
    day: input.birthDate.getUTCDate(),
    hour,
    minute,
  }, { disambiguation: "compatible" });

  return {
    year: localTime.year,
    month: localTime.month,
    day: localTime.day,
    hour,
    minute,
    second: 0,
    timezone: localTime.offsetNanoseconds / 3_600_000_000_000,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

function calculateReferenceChart(input: NatalCalculationInput, referenceTimeMinutes?: number) {
  return calculateChart(chartBirthData(input, referenceTimeMinutes), {
    ...(input.birthTimeMinutes !== null ? { houseSystem: NATAL_HOUSE_SYSTEM } : {}),
    includeAsteroids: false,
    includeChiron: NATAL_INCLUDE_CHIRON,
    includeLilith: false,
    includeNodes: NATAL_NODE_METHOD,
    includeLots: false,
    includePatterns: false,
    aspectTypes: [...NATAL_ASPECT_TYPES],
  });
}

function mapAspect(aspect: Aspect) {
  return {
    body1: aspect.body1,
    body2: aspect.body2,
    type: aspect.type,
    angle: aspect.angle,
    separation: aspect.separation,
    deviation: aspect.deviation,
    orb: aspect.orb,
    strength: aspect.strength,
    applying: aspect.isApplying,
    outOfSign: aspect.isOutOfSign,
  };
}

export type UnknownTimeAspect = ReturnType<typeof mapAspect> & {
  applying: null;
  timeReliability: "stable_across_day" | "time_sensitive";
  referenceTimeMinutes: number;
  sampleCoverage: { present: number; total: number };
  strengthRange: { minimum: number; maximum: number };
  deviationRange: { minimum: number; maximum: number };
};

function aspectKey(aspect: Aspect) {
  return `${aspect.body1}|${aspect.type}|${aspect.body2}`;
}

function unknownTimeChart(input: NatalCalculationInput) {
  const samples = UNKNOWN_TIME_ASPECT_SAMPLE_MINUTES.map((minutes) => ({
    minutes,
    chart: calculateReferenceChart(input, minutes),
  }));
  const sampledAspects = new Map<string, Array<{ minutes: number; aspect: Aspect }>>();

  for (const sample of samples) {
    for (const aspect of sample.chart.aspects.all) {
      const key = aspectKey(aspect);
      const matches = sampledAspects.get(key) ?? [];
      matches.push({ minutes: sample.minutes, aspect });
      sampledAspects.set(key, matches);
    }
  }

  const aspects = [...sampledAspects.values()].map((matches) => {
    const noon = matches.find((match) => match.minutes === 12 * 60);
    const strongest = matches.reduce((current, match) => (
      match.aspect.strength > current.aspect.strength ? match : current
    ));
    const reference = noon ?? strongest;
    const strengths = matches.map((match) => match.aspect.strength);
    const deviations = matches.map((match) => match.aspect.deviation);

    return {
      ...mapAspect(reference.aspect),
      applying: null,
      timeReliability: matches.length === samples.length
        ? "stable_across_day" as const
        : "time_sensitive" as const,
      referenceTimeMinutes: reference.minutes,
      sampleCoverage: {
        present: matches.length,
        total: samples.length,
      },
      strengthRange: {
        minimum: matches.length === samples.length ? Math.min(...strengths) : 0,
        maximum: Math.max(...strengths),
      },
      deviationRange: {
        minimum: Math.min(...deviations),
        maximum: Math.max(...deviations),
      },
    };
  });

  const rankedAspects = aspects.sort((left, right) => {
    if (left.timeReliability !== right.timeReliability) {
      return left.timeReliability === "stable_across_day" ? -1 : 1;
    }
    return right.strength - left.strength
      || left.body1.localeCompare(right.body1)
      || left.body2.localeCompare(right.body2);
  });
  const referenceChart = samples.find((sample) => sample.minutes === 12 * 60)?.chart;
  if (!referenceChart) throw new Error("Unknown-time chart is missing its noon reference sample");

  return { referenceChart, aspects: rankedAspects };
}

function mapPlanet(planet: ChartPlanet, includeHouse: boolean) {
  return {
    body: String(planet.body),
    name: planet.name,
    longitude: planet.longitude,
    latitude: planet.latitude,
    longitudeSpeed: planet.longitudeSpeed,
    retrograde: planet.isRetrograde,
    sign: planet.signName,
    degree: planet.degree,
    minute: planet.minute,
    second: planet.second,
    ...(includeHouse ? { house: planet.house } : {}),
  };
}

function mapNode(node: { name: string; type: string; longitude: number; signName: string; degree: number; minute: number; house: number }, includeHouse: boolean) {
  return {
    name: node.name,
    type: node.type,
    longitude: node.longitude,
    sign: node.signName,
    degree: node.degree,
    minute: node.minute,
    ...(includeHouse ? { house: node.house } : {}),
  };
}

export function calculateNatalChart(input: NatalCalculationInput) {
  const timeKnown = input.birthTimeMinutes !== null;
  const normalizedInput = {
    birthDate: input.birthDate.toISOString().slice(0, 10),
    birthTimeMinutes: input.birthTimeMinutes,
    latitude: input.latitude,
    longitude: input.longitude,
    timezoneId: input.timezoneId,
    referenceTime: timeKnown ? "exact" : "local-noon",
    houseSystem: timeKnown ? NATAL_HOUSE_SYSTEM : null,
    nodeMethod: NATAL_NODE_METHOD,
    includeChiron: NATAL_INCLUDE_CHIRON,
  };
  const inputHash = createHash("sha256").update(JSON.stringify({
    schemaVersion: NATAL_SCHEMA_VERSION,
    ...normalizedInput,
  })).digest("hex");

  if (!timeKnown) {
    const { referenceChart: chart, aspects } = unknownTimeChart(input);

    return {
      inputHash,
      timeAccuracy: "unknown" as const,
      houseSystem: null,
      data: {
        schemaVersion: NATAL_SCHEMA_VERSION,
        input: normalizedInput,
        planets: chart.planets.map((planet) => mapPlanet(planet, false)),
        nodes: chart.nodes.map((node) => mapNode(node, false)),
        aspects,
        angles: null,
        houses: null,
        uncertainty: {
          time: "unknown",
          referenceTime: "local-noon",
          aspectMethod: "sampled-across-local-day",
          aspectSampleMinutes: [...UNKNOWN_TIME_ASPECT_SAMPLE_MINUTES],
          note: "Planetary and lunar node positions use local noon as a neutral reference. Houses and angles are omitted. Major aspects are sampled across the local birth day and marked as stable or time-sensitive.",
        },
      },
    };
  }

  const chart = calculateReferenceChart(input);

  return {
    inputHash,
    timeAccuracy: "exact" as const,
    houseSystem: NATAL_HOUSE_SYSTEM,
    data: {
      schemaVersion: NATAL_SCHEMA_VERSION,
      input: normalizedInput,
      planets: chart.planets.map((planet) => mapPlanet(planet, true)),
      nodes: chart.nodes.map((node) => mapNode(node, true)),
      aspects: chart.aspects.all.map(mapAspect),
      angles: Object.fromEntries(Object.entries(chart.angles).map(([key, angle]) => [key, {
        name: angle.name,
        abbreviation: angle.abbrev,
        longitude: angle.longitude,
        sign: angle.signName,
        degree: angle.degree,
        minute: angle.minute,
        second: angle.second,
      }])),
      houses: {
        system: chart.houses.system,
        cusps: chart.houses.cusps.map((cusp) => ({
          house: cusp.house,
          longitude: cusp.longitude,
          sign: cusp.signName,
          degree: cusp.degree,
          minute: cusp.minute,
        })),
      },
      uncertainty: null,
    },
  };
}
