import { z } from "zod";
import catalogData from "@/data/astrology/planet-houses.json";

export const PLANET_HOUSE_PLANETS = [
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
] as const;

export const PLANET_HOUSE_HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const slug = (value: string) => value.toLowerCase();

const interpretationSchema = z.object({
  core_meaning: z.string().trim().min(1),
  possible_expressions: z.array(z.string().trim().min(1)).length(3),
  developmental_direction: z.string().trim().min(1),
}).strict();

const entrySchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("planet_house"),
  factors: z.object({
    planet: z.enum(PLANET_HOUSE_PLANETS),
    house: z.number().int().min(1).max(12),
  }).strict(),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1),
  interpretation: interpretationSchema,
}).strict();

const catalogSchema = z.object({
  version: z.number().int().positive(),
  language: z.literal("en"),
  adapted_from: z.string().trim().min(1),
  kind: z.literal("planet_house"),
  entries: z.array(entrySchema),
}).strict().superRefine((catalog, context) => {
  const expectedIds = new Set(
    PLANET_HOUSE_PLANETS.flatMap((planet) =>
      PLANET_HOUSE_HOUSES.map((house) => `planet_house.${slug(planet)}.${house}`),
    ),
  );
  const actualIds = new Set<string>();

  for (const [index, entry] of catalog.entries.entries()) {
    const expectedId = `planet_house.${slug(entry.factors.planet)}.${entry.factors.house}`;
    if (entry.id !== expectedId) {
      context.addIssue({
        code: "custom",
        path: ["entries", index, "id"],
        message: `Expected ${expectedId} for the supplied factors`,
      });
    }
    if (actualIds.has(entry.id)) {
      context.addIssue({
        code: "custom",
        path: ["entries", index, "id"],
        message: `Duplicate interpretation id ${entry.id}`,
      });
    }
    actualIds.add(entry.id);
  }

  for (const expectedId of expectedIds) {
    if (!actualIds.has(expectedId)) {
      context.addIssue({ code: "custom", path: ["entries"], message: `Missing ${expectedId}` });
    }
  }

  if (catalog.entries.length !== expectedIds.size) {
    context.addIssue({
      code: "custom",
      path: ["entries"],
      message: `Expected ${expectedIds.size} entries, received ${catalog.entries.length}`,
    });
  }
});

export type PlanetHousePlanet = typeof PLANET_HOUSE_PLANETS[number];
export type PlanetHouseHouse = typeof PLANET_HOUSE_HOUSES[number];
export type PlanetHouseInterpretation = z.infer<typeof entrySchema>;

export const planetHouseInterpretationCatalog = catalogSchema.parse(catalogData);

const interpretationsById = new Map(
  planetHouseInterpretationCatalog.entries.map((entry) => [entry.id, entry]),
);

export function getPlanetHouseInterpretation(
  planet: PlanetHousePlanet,
  house: PlanetHouseHouse,
): PlanetHouseInterpretation {
  const id = `planet_house.${slug(planet)}.${house}`;
  const interpretation = interpretationsById.get(id);
  if (!interpretation) throw new Error(`Missing planet-house interpretation: ${id}`);
  return interpretation;
}
