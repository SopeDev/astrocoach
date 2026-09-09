import { z } from "zod";

export const astrologyProvenanceFields = {
  usedAstrologyFactorIds: z.array(z.string().trim().min(1)).max(6).default([]),
  usedTransitIds: z.array(z.string().trim().min(1)).max(6).default([]),
};

const storedAstrologyProvenanceSchema = z.object({
  usedAstrologyFactorIds: astrologyProvenanceFields.usedAstrologyFactorIds.optional(),
  usedTransitIds: astrologyProvenanceFields.usedTransitIds.optional(),
}).passthrough();

export function storedAstrologyProvenance(value: unknown) {
  const parsed = storedAstrologyProvenanceSchema.safeParse(value);
  return parsed.success
    ? {
        usedAstrologyFactorIds: parsed.data.usedAstrologyFactorIds ?? [],
        usedTransitIds: parsed.data.usedTransitIds ?? [],
      }
    : { usedAstrologyFactorIds: [], usedTransitIds: [] };
}
