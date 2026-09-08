import "server-only";

import { db } from "@/db/client";
import {
  createCurrentTransitSnapshot,
  currentTransitSnapshotSchema,
  CURRENT_TRANSIT_SNAPSHOT_VERSION,
  transitSnapshotIsFresh,
  type CurrentTransitSnapshot,
} from "@/lib/discovery-astrology";
import { NATAL_ENGINE_VERSION } from "@/lib/natal-chart";

const CURRENT_TRANSIT_SNAPSHOT_ID = "current";

type StoredTransitSnapshot = {
  schemaVersion: number;
  engineVersion: string;
  calculatedAt: Date;
  data: unknown;
};

function parseStoredTransitSnapshot(value: StoredTransitSnapshot | null) {
  if (
    !value
    || value.schemaVersion !== CURRENT_TRANSIT_SNAPSHOT_VERSION
    || value.engineVersion !== NATAL_ENGINE_VERSION
  ) {
    return null;
  }
  const parsed = currentTransitSnapshotSchema.safeParse(value.data);
  if (
    !parsed.success
    || parsed.data.engine.version !== value.engineVersion
    || parsed.data.calculatedAt !== value.calculatedAt.toISOString()
  ) {
    return null;
  }
  return parsed.data;
}

async function loadStoredTransitSnapshot() {
  return db.transitSnapshot.findUnique({
    where: { id: CURRENT_TRANSIT_SNAPSHOT_ID },
    select: {
      schemaVersion: true,
      engineVersion: true,
      calculatedAt: true,
      updatedAt: true,
      data: true,
    },
  });
}

function persistenceData(snapshot: CurrentTransitSnapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    engineVersion: snapshot.engine.version,
    calculatedAt: new Date(snapshot.calculatedAt),
    data: snapshot,
  };
}

export async function getCurrentTransitSnapshot(
  now = new Date(),
): Promise<CurrentTransitSnapshot> {
  const stored = await loadStoredTransitSnapshot();
  const parsedStored = parseStoredTransitSnapshot(stored);
  if (parsedStored && transitSnapshotIsFresh(parsedStored, now)) return parsedStored;

  const candidate = createCurrentTransitSnapshot({
    engineVersion: NATAL_ENGINE_VERSION,
    calculatedAt: now,
  });

  if (!stored) {
    try {
      await db.transitSnapshot.create({
        data: {
          id: CURRENT_TRANSIT_SNAPSHOT_ID,
          ...persistenceData(candidate),
        },
      });
      return candidate;
    } catch (error) {
      const winner = parseStoredTransitSnapshot(await loadStoredTransitSnapshot());
      if (winner && transitSnapshotIsFresh(winner, now)) return winner;
      throw error;
    }
  }

  const updated = await db.transitSnapshot.updateMany({
    where: {
      id: CURRENT_TRANSIT_SNAPSHOT_ID,
      updatedAt: stored.updatedAt,
    },
    data: persistenceData(candidate),
  });
  if (updated.count === 1) return candidate;

  const winner = parseStoredTransitSnapshot(await loadStoredTransitSnapshot());
  if (winner && transitSnapshotIsFresh(winner, now)) return winner;
  throw new Error("Current transit snapshot could not be refreshed consistently");
}
