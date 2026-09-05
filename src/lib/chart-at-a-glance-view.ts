import type { Locale } from "@/i18n/config";
import {
  chartThemePresentation,
  natalFactorLabel,
  type NatalInterpretationDocument,
} from "@/lib/natal-interpretation";

export type ChartThemeView = {
  id: NatalInterpretationDocument["chartAtAGlance"]["themes"][number]["id"];
  slot: NatalInterpretationDocument["chartAtAGlance"]["themes"][number]["slot"];
  title: string;
  synthesis: string;
  possibleExpressions: string[];
  supportingFactors: string[];
};

export function chartAtAGlanceView(
  document: NatalInterpretationDocument,
  locale: Locale,
) {
  const factorMap = new Map(document.rankedFactors.map((factor) => [factor.id, factor]));
  return {
    uncertain: Boolean(document.chartAtAGlance.uncertainty),
    themes: document.chartAtAGlance.themes.map((theme): ChartThemeView => {
      const presentation = chartThemePresentation(theme, locale);
      return {
        id: theme.id,
        slot: theme.slot,
        ...presentation,
        supportingFactors: theme.supportingFactorIds.flatMap((id) => {
          const factor = factorMap.get(id);
          return factor ? [natalFactorLabel(factor, locale)] : [];
        }),
      };
    }),
  };
}
