import { z } from "zod";

const placementSchema = z.object({
  name: z.string(),
  longitude: z.number(),
  sign: z.string(),
  degree: z.number(),
  minute: z.number(),
  retrograde: z.boolean().optional(),
  house: z.number().optional(),
});

const angleSchema = z.object({
  name: z.string(),
  abbreviation: z.string(),
  longitude: z.number(),
  sign: z.string(),
  degree: z.number(),
  minute: z.number(),
});

export const natalChartReviewSchema = z.object({
  input: z.object({
    birthDate: z.string(),
    birthTimeMinutes: z.number().nullable(),
    timezoneId: z.string(),
    referenceTime: z.enum(["exact", "local-noon"]),
  }),
  planets: z.array(placementSchema),
  nodes: z.array(placementSchema),
  angles: z.record(z.string(), angleSchema).nullable(),
  houses: z.object({
    system: z.string(),
    cusps: z.array(z.object({
      house: z.number(),
      longitude: z.number(),
      sign: z.string(),
      degree: z.number(),
      minute: z.number(),
    })),
  }).nullable(),
  uncertainty: z.object({ note: z.string() }).nullable(),
});
