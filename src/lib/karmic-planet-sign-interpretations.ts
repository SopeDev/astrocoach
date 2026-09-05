import { z } from "zod";
import catalogData from "@/data/astrology/karmic-planet-signs.json";

export const KARMIC_PLANET_SIGN_PLANETS = ["Moon", "Saturn"] as const;
export const KARMIC_PLANET_SIGN_SIGNS = [
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
const interpretationId = (planet: string, sign: string) =>
  ["karmic_planet_sign", slug(planet), slug(sign)].join(".");

const interpretationSchema = z.object({
  core_meaning: z.string().trim().min(1),
  possible_expressions: z.array(z.string().trim().min(1)).length(3),
  developmental_direction: z.string().trim().min(1),
}).strict();

const entrySchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("karmic_planet_sign"),
  lens: z.literal("karmic"),
  factors: z.object({
    planet: z.enum(KARMIC_PLANET_SIGN_PLANETS),
    sign: z.enum(KARMIC_PLANET_SIGN_SIGNS),
  }).strict(),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1),
  interpretation: interpretationSchema,
}).strict();

const catalogSchema = z.object({
  version: z.number().int().positive(),
  language: z.literal("en"),
  adapted_from: z.string().trim().min(1),
  kind: z.literal("karmic_planet_sign"),
  entries: z.array(entrySchema),
}).strict().superRefine((catalog, context) => {
  const expectedIds = new Set(
    KARMIC_PLANET_SIGN_PLANETS.flatMap((planet) =>
      KARMIC_PLANET_SIGN_SIGNS.map((sign) => interpretationId(planet, sign)),
    ),
  );
  const actualIds = new Set<string>();

  for (const [index, entry] of catalog.entries.entries()) {
    const expectedId = interpretationId(entry.factors.planet, entry.factors.sign);
    if (entry.id !== expectedId) {
      context.addIssue({
        code: "custom",
        path: ["entries", index, "id"],
        message: "Expected " + expectedId + " for the supplied factors",
      });
    }
    if (actualIds.has(entry.id)) {
      context.addIssue({
        code: "custom",
        path: ["entries", index, "id"],
        message: "Duplicate interpretation id " + entry.id,
      });
    }
    actualIds.add(entry.id);
  }

  for (const expectedId of expectedIds) {
    if (!actualIds.has(expectedId)) {
      context.addIssue({
        code: "custom",
        path: ["entries"],
        message: "Missing " + expectedId,
      });
    }
  }

  if (catalog.entries.length !== expectedIds.size) {
    context.addIssue({
      code: "custom",
      path: ["entries"],
      message: "Expected " + expectedIds.size + " entries, received " + catalog.entries.length,
    });
  }
});

export type KarmicPlanetSignPlanet = typeof KARMIC_PLANET_SIGN_PLANETS[number];
export type KarmicPlanetSignSign = typeof KARMIC_PLANET_SIGN_SIGNS[number];
export type KarmicPlanetSignInterpretation = z.infer<typeof entrySchema>;

export const karmicPlanetSignInterpretationCatalog = catalogSchema.parse(catalogData);

const interpretationsById = new Map(
  karmicPlanetSignInterpretationCatalog.entries.map((entry) => [entry.id, entry]),
);

export function getKarmicPlanetSignInterpretation(
  planet: KarmicPlanetSignPlanet,
  sign: KarmicPlanetSignSign,
): KarmicPlanetSignInterpretation {
  const id = interpretationId(planet, sign);
  const interpretation = interpretationsById.get(id);
  if (!interpretation) throw new Error("Missing karmic planet-sign interpretation: " + id);
  return interpretation;
}
