import "server-only";

import { z } from "zod";
import type { Locale } from "@/i18n/config";
import { getGeoNamesUsername } from "@/lib/env";

const placeSchema = z.object({
  geonameId: z.number().int(),
  name: z.string().min(1),
  adminName1: z.string().optional(),
  countryName: z.string().min(1),
  countryCode: z.string().length(2),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const searchResponseSchema = z.object({
  geonames: z.array(placeSchema).default([]),
  status: z.object({ message: z.string() }).optional(),
});

const timezoneResponseSchema = z.object({
  timezoneId: z.string().min(1).optional(),
  status: z.object({ message: z.string() }).optional(),
});

export type PlaceSearchResult = z.infer<typeof placeSchema> & { label: string };

function labelPlace(place: z.infer<typeof placeSchema>) {
  return [place.name, place.adminName1, place.countryName].filter(Boolean).join(", ");
}

async function requestGeoNames(path: string, params: Record<string, string>) {
  const url = new URL(`https://secure.geonames.org/${path}`);
  url.search = new URLSearchParams({ ...params, username: getGeoNamesUsername() }).toString();
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });

  if (!response.ok) {
    throw new Error(`GeoNames request failed with status ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

export async function searchPlaces(query: string, locale: Locale): Promise<PlaceSearchResult[]> {
  const payload = searchResponseSchema.parse(await requestGeoNames("searchJSON", {
    name_startsWith: query,
    featureClass: "P",
    isNameRequired: "true",
    maxRows: "8",
    orderby: "relevance",
    lang: locale,
  }));

  if (payload.status) {
    throw new Error(payload.status.message);
  }

  return payload.geonames.map((place) => ({ ...place, label: labelPlace(place) }));
}

export async function getPlace(geonameId: number, locale: Locale) {
  const place = placeSchema.parse(await requestGeoNames("getJSON", {
    geonameId: String(geonameId),
    lang: locale,
  }));

  return { ...place, label: labelPlace(place) };
}

export async function getTimezone(latitude: number, longitude: number) {
  const payload = timezoneResponseSchema.parse(await requestGeoNames("timezoneJSON", {
    lat: String(latitude),
    lng: String(longitude),
  }));

  if (payload.status || !payload.timezoneId) {
    throw new Error(payload.status?.message ?? "GeoNames returned no timezone");
  }

  return payload.timezoneId;
}
