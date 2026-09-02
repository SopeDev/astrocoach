"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LoaderCircle, MapPin, Search } from "lucide-react";
import { saveBirthLocation, type BirthLocationFormState } from "@/app/actions/birth-location";
import { ChartCalculationScreen } from "@/components/chart-calculation-screen";
import type { Locale } from "@/i18n/config";

type LocationResult = {
  geonameId: number;
  label: string;
  lat: number;
  lng: number;
};

type LocationMessages = {
  searchLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  searching: string;
  noResults: string;
  searchError: string;
  selectedLabel: string;
  continue: string;
  calculatingTitle: string;
  calculatingDescription: string;
  errors: { required: string; service: string };
};

const initialState: BirthLocationFormState = {};

export function BirthLocationForm({ locale, messages, defaultLocation }: {
  locale: Locale;
  messages: LocationMessages;
  defaultLocation?: { geonameId: number; label: string };
}) {
  const [state, formAction, pending] = useActionState(saveBirthLocation.bind(null, locale), initialState);
  const [query, setQuery] = useState(defaultLocation?.label ?? "");
  const [selected, setSelected] = useState(defaultLocation);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const skipNextSearch = useRef(Boolean(defaultLocation));

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchFailed(false);

      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}`, { signal: controller.signal });

        if (!response.ok) {
          throw new Error("Location search failed");
        }

        const payload = await response.json() as { results: LocationResult[] };
        setResults(payload.results);
        setActiveIndex(-1);
        setSearched(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
          setSearchFailed(true);
          setSearched(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locale, query]);

  function chooseLocation(location: LocationResult) {
    skipNextSearch.current = true;
    setSelected({ geonameId: location.geonameId, label: location.label });
    setQuery(location.label);
    setResults([]);
    setSearched(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      chooseLocation(results[activeIndex]);
    } else if (event.key === "Escape") {
      setResults([]);
      setActiveIndex(-1);
    }
  }

  const formError = state.error === "service" ? messages.errors.service : state.error ? messages.errors.required : undefined;
  const listVisible = results.length > 0;

  return (
    <form action={formAction} className="space-y-6">
      {pending ? (
        <ChartCalculationScreen description={messages.calculatingDescription} title={messages.calculatingTitle} />
      ) : null}
      <input name="geonameId" type="hidden" value={selected?.geonameId ?? ""} />
      <div className="relative">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="birthLocation">
          <MapPin aria-hidden="true" className="size-4 text-violet-600 dark:text-violet-300" />
          {messages.searchLabel}
        </label>
        <div className="relative mt-2">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-activedescendant={activeIndex >= 0 ? `location-option-${results[activeIndex]?.geonameId}` : undefined}
            aria-autocomplete="list"
            aria-controls="location-results"
            aria-describedby={formError ? "location-error" : "location-hint"}
            aria-expanded={listVisible}
            aria-invalid={Boolean(formError)}
            autoComplete="off"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-base text-slate-950 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            id="birthLocation"
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setSelected(undefined);
              if (nextQuery.trim().length < 2) {
                setResults([]);
                setSearched(false);
                setSearching(false);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={messages.searchPlaceholder}
            role="combobox"
            value={query}
          />
          {searching ? <LoaderCircle aria-label={messages.searching} className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-violet-600" /> : null}
        </div>

        {listVisible ? (
          <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900" id="location-results" role="listbox">
            {results.map((location, index) => (
              <li aria-selected={index === activeIndex} id={`location-option-${location.geonameId}`} key={location.geonameId} role="option">
                <button className={`${index === activeIndex ? "bg-violet-50 dark:bg-violet-950/60" : "hover:bg-slate-50 dark:hover:bg-slate-800"} flex min-h-12 w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-800 transition dark:text-slate-100`} onClick={() => chooseLocation(location)} type="button">
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" />
                  <span>{location.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {formError ? <p className="mt-2 text-sm text-red-700 dark:text-red-300" id="location-error" role="alert">{formError}</p> : searchFailed ? <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{messages.searchError}</p> : searched && !searching && query.trim().length >= 2 ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{messages.noResults}</p> : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400" id="location-hint">{messages.searchHint}</p>}
      </div>

      {selected ? <div className="rounded-xl bg-violet-50 p-4 text-sm text-violet-900 dark:bg-violet-950/50 dark:text-violet-100"><span className="font-semibold">{messages.selectedLabel}</span> {selected.label}</div> : null}

      <button className="min-h-12 w-full cursor-pointer rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-wait disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500" disabled={pending} type="submit">{pending ? messages.calculatingTitle : messages.continue}</button>
    </form>
  );
}
