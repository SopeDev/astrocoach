import { z } from "zod";
import catalogData from "@/data/astrology/aspects.json";

export const MAJOR_ASPECT_TYPES = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
] as const;

const aspectInterpretationSchema = z.object({
  core_meaning: z.string().trim().min(1),
  possible_expressions: z.array(z.string().trim().min(1)).length(3),
  developmental_direction: z.string().trim().min(1),
}).strict();

const aspectEntrySchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("major_aspect"),
  factors: z.object({ type: z.enum(MAJOR_ASPECT_TYPES) }).strict(),
  topics: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).min(1),
  interpretation: aspectInterpretationSchema,
}).strict();

const aspectCatalogSchema = z.object({
  version: z.number().int().positive(),
  language: z.literal("en"),
  adapted_from: z.string().trim().min(1),
  kind: z.literal("major_aspect"),
  entries: z.array(aspectEntrySchema),
}).strict();

export type MajorAspectType = typeof MAJOR_ASPECT_TYPES[number];
export type MajorAspectInterpretation = z.infer<typeof aspectEntrySchema>;

export const aspectInterpretationCatalog = aspectCatalogSchema.parse(catalogData);

const actualIds = aspectInterpretationCatalog.entries.map((entry) => entry.id);
const expectedIds = MAJOR_ASPECT_TYPES.map((type) => `aspect.${type}`);
const actualIdSet = new Set(actualIds);
const missingIds = expectedIds.filter((id) => !actualIdSet.has(id));
const unexpectedIds = actualIds.filter((id) => !expectedIds.includes(id));
if (
  actualIdSet.size !== actualIds.length
  || missingIds.length > 0
  || unexpectedIds.length > 0
  || actualIds.length !== expectedIds.length
) {
  throw new Error(
    `Major aspect catalog coverage is invalid; missing: ${missingIds.join(", ") || "none"}; unexpected: ${unexpectedIds.join(", ") || "none"}`,
  );
}

const aspectsByType = new Map(
  aspectInterpretationCatalog.entries.map((entry) => [entry.factors.type, entry]),
);

export function getAspectInterpretation(type: MajorAspectType): MajorAspectInterpretation {
  const interpretation = aspectsByType.get(type);
  if (!interpretation) throw new Error(`Missing major aspect interpretation: ${type}`);
  return interpretation;
}
