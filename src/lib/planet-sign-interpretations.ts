import { z } from "zod";
import catalogData from "@/data/astrology/planet-signs.json";

export const PLANET_SIGN_PLANETS = [
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

export const PLANET_SIGN_SIGNS = [
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

const slug = (value: string) => value.toLowerCase();

const interpretationSchema = z.object({
  core_meaning: z.string().trim().min(1),
  possible_expressions: z.array(z.string().trim().min(1)).length(3),
  developmental_direction: z.string().trim().min(1),
}).strict();

const entrySchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("planet_sign"),
  factors: z.object({
    planet: z.enum(PLANET_SIGN_PLANETS),
    sign: z.enum(PLANET_SIGN_SIGNS),
  }).strict(),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1),
  interpretation: interpretationSchema,
}).strict();

const catalogSchema = z.object({
  version: z.number().int().positive(),
  language: z.literal("en"),
  adapted_from: z.string().trim().min(1),
  kind: z.literal("planet_sign"),
  entries: z.array(entrySchema),
}).strict().superRefine((catalog, context) => {
  const expectedIds = new Set(
    PLANET_SIGN_PLANETS.flatMap((planet) =>
      PLANET_SIGN_SIGNS.map((sign) => `planet_sign.${slug(planet)}.${slug(sign)}`),
    ),
  );
  const actualIds = new Set<string>();

  for (const [index, entry] of catalog.entries.entries()) {
    const expectedId = `planet_sign.${slug(entry.factors.planet)}.${slug(entry.factors.sign)}`;
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

export type PlanetSignPlanet = typeof PLANET_SIGN_PLANETS[number];
export type PlanetSignSign = typeof PLANET_SIGN_SIGNS[number];
export type PlanetSignInterpretation = z.infer<typeof entrySchema>;

export const planetSignInterpretationCatalog = catalogSchema.parse(catalogData);

const interpretationsById = new Map(
  planetSignInterpretationCatalog.entries.map((entry) => [entry.id, entry]),
);

export function getPlanetSignInterpretation(
  planet: PlanetSignPlanet,
  sign: PlanetSignSign,
): PlanetSignInterpretation {
  const id = `planet_sign.${slug(planet)}.${slug(sign)}`;
  const interpretation = interpretationsById.get(id);
  if (!interpretation) throw new Error(`Missing planet-sign interpretation: ${id}`);
  return interpretation;
}
