import { z } from "zod";

export const DEFAULT_ASTROLOGY_STYLE = "background" as const;

export function privateChartContext(value: unknown) {
  const chart = z.object({
    planets: z.array(z.object({ name: z.string(), sign: z.string(), degree: z.number(), minute: z.number(), house: z.number().optional() })).optional(),
    nodes: z.array(z.object({ name: z.string(), sign: z.string(), degree: z.number(), minute: z.number(), house: z.number().optional() })).optional(),
    aspects: z.array(z.object({ body1: z.string(), body2: z.string(), type: z.string(), orb: z.number(), strength: z.number() })).optional(),
    angles: z.record(z.string(), z.object({ sign: z.string(), degree: z.number(), minute: z.number() })).nullable().optional(),
    uncertainty: z.unknown().optional(),
  }).passthrough().safeParse(value);

  if (!chart.success) return null;
  return {
    planets: chart.data.planets,
    nodes: chart.data.nodes,
    angles: chart.data.angles,
    aspects: chart.data.aspects?.slice(0, 20),
    uncertainty: chart.data.uncertainty,
  };
}
