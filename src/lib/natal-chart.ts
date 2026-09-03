import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { calculateChart, type BirthData, type ChartPlanet } from "celestine";

export const NATAL_ENGINE = "celestine";
export const NATAL_ENGINE_VERSION = "0.2.1";
export const NATAL_SCHEMA_VERSION = 2;
export const NATAL_HOUSE_SYSTEM = "placidus" as const;
export const NATAL_NODE_METHOD = "mean" as const;
export const NATAL_INCLUDE_CHIRON = true;

export type NatalCalculationInput = {
  birthDate: Date;
  birthTimeMinutes: number | null;
  latitude: number;
  longitude: number;
  timezoneId: string;
};

function chartBirthData(input: NatalCalculationInput): BirthData {
  const timeKnown = input.birthTimeMinutes !== null;
  const hour = timeKnown ? Math.floor(input.birthTimeMinutes! / 60) : 12;
  const minute = timeKnown ? input.birthTimeMinutes! % 60 : 0;
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
  const birth = chartBirthData(input);
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
  const inputHash = createHash("sha256").update(JSON.stringify(normalizedInput)).digest("hex");

  if (!timeKnown) {
    const chart = calculateChart(birth, {
      includeAsteroids: false,
      includeChiron: NATAL_INCLUDE_CHIRON,
      includeLilith: false,
      includeNodes: NATAL_NODE_METHOD,
      includeLots: false,
      includePatterns: false,
    });

    return {
      inputHash,
      timeAccuracy: "unknown" as const,
      houseSystem: null,
      data: {
        schemaVersion: NATAL_SCHEMA_VERSION,
        input: normalizedInput,
        planets: chart.planets.map((planet) => mapPlanet(planet, false)),
        nodes: chart.nodes.map((node) => mapNode(node, false)),
        aspects: [],
        angles: null,
        houses: null,
        uncertainty: {
          time: "unknown",
          referenceTime: "local-noon",
          note: "Planetary and lunar node positions use local noon as a neutral reference. Houses, angles, and aspects are intentionally omitted.",
        },
      },
    };
  }

  const chart = calculateChart(birth, {
    houseSystem: NATAL_HOUSE_SYSTEM,
    includeAsteroids: false,
    includeChiron: NATAL_INCLUDE_CHIRON,
    includeLilith: false,
    includeNodes: NATAL_NODE_METHOD,
    includeLots: false,
    includePatterns: false,
  });

  return {
    inputHash,
    timeAccuracy: "exact" as const,
    houseSystem: NATAL_HOUSE_SYSTEM,
    data: {
      schemaVersion: NATAL_SCHEMA_VERSION,
      input: normalizedInput,
      planets: chart.planets.map((planet) => mapPlanet(planet, true)),
      nodes: chart.nodes.map((node) => mapNode(node, true)),
      aspects: chart.aspects.all.map((aspect) => ({
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
      })),
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
