import "server-only";

import { Temporal } from "@js-temporal/polyfill";

export function resolveBirthInstant({
  birthDate,
  birthTimeMinutes,
  timezoneId,
}: {
  birthDate: Date;
  birthTimeMinutes: number | null;
  timezoneId: string;
}) {
  if (birthTimeMinutes === null) {
    return { birthInstant: null, utcOffsetMinutes: null };
  }

  const zonedBirthTime = Temporal.ZonedDateTime.from({
    timeZone: timezoneId,
    year: birthDate.getUTCFullYear(),
    month: birthDate.getUTCMonth() + 1,
    day: birthDate.getUTCDate(),
    hour: Math.floor(birthTimeMinutes / 60),
    minute: birthTimeMinutes % 60,
  }, { disambiguation: "compatible" });

  return {
    birthInstant: new Date(zonedBirthTime.epochMilliseconds),
    utcOffsetMinutes: Math.round(zonedBirthTime.offsetNanoseconds / 60_000_000_000),
  };
}
