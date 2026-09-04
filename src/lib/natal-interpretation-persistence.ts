import "server-only";

import { db } from "@/db/client";
import {
  interpretationIsCurrent,
  natalInterpretationDocumentSchema,
  NATAL_INTERPRETATION_SCHEMA_VERSION,
  type NatalInterpretationDocument,
} from "@/lib/natal-interpretation";
import { prepareNatalInterpretation } from "@/lib/natal-interpretation-generation";

type StoredNatalChart = {
  id: string;
  inputHash: string;
  timeAccuracy: string;
  data: unknown;
};

export async function ensureNatalInterpretation(
  userId: string,
  natalChart: StoredNatalChart,
): Promise<NatalInterpretationDocument> {
  const existing = await db.natalInterpretation.findUnique({ where: { userId } });
  if (existing && interpretationIsCurrent(existing.data, natalChart.inputHash)) {
    return natalInterpretationDocumentSchema.parse(existing.data);
  }

  const prepared = await prepareNatalInterpretation({
    chart: natalChart.data,
    inputHash: natalChart.inputHash,
    timeAccuracy: natalChart.timeAccuracy,
  });
  await db.natalInterpretation.upsert({
    where: { userId },
    create: {
      userId,
      natalChartId: natalChart.id,
      schemaVersion: NATAL_INTERPRETATION_SCHEMA_VERSION,
      sourceChartInputHash: natalChart.inputHash,
      generationMethod: prepared.generationMethod,
      model: prepared.model,
      data: prepared.document,
      generatedAt: new Date(),
    },
    update: {
      natalChartId: natalChart.id,
      schemaVersion: NATAL_INTERPRETATION_SCHEMA_VERSION,
      sourceChartInputHash: natalChart.inputHash,
      generationMethod: prepared.generationMethod,
      model: prepared.model,
      data: prepared.document,
      generatedAt: new Date(),
    },
  });
  return prepared.document;
}
