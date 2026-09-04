import { z } from "zod";
import houseCatalogData from "@/data/astrology/house-archetypes.json";
import planetCatalogData from "@/data/astrology/planet-archetypes.json";
import signCatalogData from "@/data/astrology/sign-archetypes.json";

export const ARCHETYPE_PLANETS = [
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
] as const;

export const ARCHETYPE_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export const ARCHETYPE_HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const interpretationSchema = z.object({
  core_meaning: z.string().trim().min(1),
  possible_expressions: z.array(z.string().trim().min(1)).length(3),
  developmental_direction: z.string().trim().min(1),
}).strict();

const sharedEntryFields = {
  topics: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1),
  interpretation: interpretationSchema,
};

const planetEntrySchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("planet_archetype"),
  factors: z.object({ planet: z.enum(ARCHETYPE_PLANETS) }).strict(),
  ...sharedEntryFields,
}).strict();

const signEntrySchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("sign_archetype"),
  factors: z.object({ sign: z.enum(ARCHETYPE_SIGNS) }).strict(),
  ...sharedEntryFields,
}).strict();

const houseEntrySchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("house_archetype"),
  factors: z.object({ house: z.number().int().min(1).max(12) }).strict(),
  ...sharedEntryFields,
}).strict();

function catalogSchema<Kind extends string, Entry extends z.ZodType>(kind: Kind, entry: Entry) {
  return z.object({
    version: z.number().int().positive(),
    language: z.literal("en"),
    adapted_from: z.string().trim().min(1),
    kind: z.literal(kind),
    entries: z.array(entry),
  }).strict();
}

export type ArchetypePlanet = typeof ARCHETYPE_PLANETS[number];
export type ArchetypeSign = typeof ARCHETYPE_SIGNS[number];
export type ArchetypeHouse = typeof ARCHETYPE_HOUSES[number];
export type PlanetArchetypeInterpretation = z.infer<typeof planetEntrySchema>;
export type SignArchetypeInterpretation = z.infer<typeof signEntrySchema>;
export type HouseArchetypeInterpretation = z.infer<typeof houseEntrySchema>;

export const planetArchetypeCatalog = catalogSchema("planet_archetype", planetEntrySchema).parse(planetCatalogData);
export const signArchetypeCatalog = catalogSchema("sign_archetype", signEntrySchema).parse(signCatalogData);
export const houseArchetypeCatalog = catalogSchema("house_archetype", houseEntrySchema).parse(houseCatalogData);

function validateCoverage(label: string, actualIds: string[], expectedIds: string[]) {
  const actual = new Set(actualIds);
  if (actual.size !== actualIds.length) throw new Error(`${label} contains duplicate ids`);

  const missing = expectedIds.filter((id) => !actual.has(id));
  const unexpected = actualIds.filter((id) => !expectedIds.includes(id));
  if (missing.length || unexpected.length || actualIds.length !== expectedIds.length) {
    throw new Error(`${label} coverage is invalid; missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}`);
  }
}

validateCoverage(
  "Planet archetype catalog",
  planetArchetypeCatalog.entries.map((entry) => entry.id),
  ARCHETYPE_PLANETS.map((planet) => `planet.${planet.toLowerCase()}`),
);
validateCoverage(
  "Sign archetype catalog",
  signArchetypeCatalog.entries.map((entry) => entry.id),
  ARCHETYPE_SIGNS.map((sign) => `sign.${sign.toLowerCase()}`),
);
validateCoverage(
  "House archetype catalog",
  houseArchetypeCatalog.entries.map((entry) => entry.id),
  ARCHETYPE_HOUSES.map((house) => `house.${house}`),
);

const planetArchetypesById = new Map(
  planetArchetypeCatalog.entries.map((entry) => [entry.id, entry]),
);
const signArchetypesById = new Map(
  signArchetypeCatalog.entries.map((entry) => [entry.id, entry]),
);
const houseArchetypesById = new Map(
  houseArchetypeCatalog.entries.map((entry) => [entry.id, entry]),
);

export function getPlanetArchetype(
  planet: ArchetypePlanet,
): PlanetArchetypeInterpretation {
  const id = `planet.${planet.toLowerCase()}`;
  const interpretation = planetArchetypesById.get(id);
  if (!interpretation) throw new Error(`Missing planet archetype: ${id}`);
  return interpretation;
}

export function getSignArchetype(
  sign: ArchetypeSign,
): SignArchetypeInterpretation {
  const id = `sign.${sign.toLowerCase()}`;
  const interpretation = signArchetypesById.get(id);
  if (!interpretation) throw new Error(`Missing sign archetype: ${id}`);
  return interpretation;
}

export function getHouseArchetype(
  house: ArchetypeHouse,
): HouseArchetypeInterpretation {
  const id = `house.${house}`;
  const interpretation = houseArchetypesById.get(id);
  if (!interpretation) throw new Error(`Missing house archetype: ${id}`);
  return interpretation;
}
