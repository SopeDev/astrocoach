import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isLocale } from "@/i18n/config";
import { searchPlaces } from "@/lib/geonames";

export async function GET(request: Request) {
  if (!(await auth())?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const requestedLocale = searchParams.get("locale") ?? "en";

  if (!isLocale(requestedLocale) || query.length < 2 || query.length > 80) {
    return NextResponse.json({ results: [] });
  }

  try {
    return NextResponse.json({ results: await searchPlaces(query, requestedLocale) });
  } catch (error) {
    console.error("GeoNames place search failed", error);
    return NextResponse.json({ error: "Location search is temporarily unavailable" }, { status: 503 });
  }
}
