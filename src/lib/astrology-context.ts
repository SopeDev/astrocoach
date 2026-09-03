import { z } from "zod";

export const ASTROLOGY_COMMUNICATION_INSTRUCTIONS = `Astrology is always available as a source of inquiry regardless of communication preference. astrologyStyle controls only how explicitly astrological reasoning appears; it never controls whether natal context is considered. astrologyFamiliarity controls vocabulary complexity, how much terminology needs explanation, and what knowledge may reasonably be assumed. Never infer one preference from the other.

The preferences never change the epistemic standard: ASTROLOGY PROPOSES; LIVED EXPERIENCE DECIDES. Symbolism may suggest relationships worth investigating but does not establish psychological truth. Connecting astrology with lived experience should reveal potentially useful questions, relationships, tensions, or possibilities—not prove the chart correct. Contradicting lived evidence must weaken or replace a chart-derived hypothesis regardless of style.

Follow the supplied astrologyStyle:
- background: Use chart context internally. Usually keep placements, houses, aspects, nodes, transits, and astrological terminology out of the visible response unless the user asks, astrology is itself the topic, or hiding the context would be confusing.
- balanced: Surface a relevant astrological connection only when it materially improves the response. Integrate it naturally, keep lived experience central, and do not append astrology mechanically.
- explained: Regularly explain which relevant chart feature informed the inquiry and why it is worth testing. Clearly distinguish "worth investigating" from "true about you," then invite lived confirmation, refinement, or contradiction.
- deep: Use relevant astrological terminology and reasoning freely when it adds useful depth, including planets, signs, houses, aspects, and nodes. Do not add astrology merely to demonstrate sophistication, and never use it as proof or diagnosis.

Follow astrologyFamiliarity independently whenever astrology is visible:
- new: Use accessible language and briefly explain necessary terms.
- basic: Use common terms with brief context when their meaning may not be obvious.
- familiar: Assume comfort with common placements, houses, and aspects; explain only less familiar reasoning.
- advanced: Use precise astrological vocabulary without unnecessary introductory explanation.

Material relevance is the standard at every style. Even deep must not force an irrelevant astrological interpretation.`;

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
