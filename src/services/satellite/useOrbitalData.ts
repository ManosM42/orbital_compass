/**
 * React data hooks: cached element-set retrieval, live local propagation,
 * observer location (real browser geolocation) and favourites by NORAD id.
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchIssCrew, fetchTleGroup } from "./satelliteApi";
import { metaFor } from "./satelliteCatalog";
import { FRESH_MS, readCache, statusFor, writeCache } from "./satelliteCache";
import { propagateMany } from "./satellitePropagation";
import type {
  DataSourceInfo,
  DataStatus,
  ObserverLocation,
  Satellite,
  SatelliteState,
  TleFetchResult,
  TleGroup,
} from "./satelliteTypes";

/* ------------------------------------------------------------------ */
/* Online status                                                       */
/* ------------------------------------------------------------------ */

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/* ------------------------------------------------------------------ */
/* Element sets                                                        */
/* ------------------------------------------------------------------ */

function toSatellites(payload: TleFetchResult): Satellite[] {
  return payload.records.map((r) => {
    const meta = metaFor(r.noradId, r.name, r.group);
    return {
      id: `sat-${r.noradId}`,
      noradId: r.noradId,
      name: r.name,
      operator: meta.operator,
      country: meta.country,
      category: meta.category,
      ...(meta.launchDate ? { launchDate: meta.launchDate } : {}),
      ...(meta.description ? { description: meta.description } : {}),
      tle: r.tle,
      epoch: r.epoch,
      group: r.group,
    } satisfies Satellite;
  });
}

export interface OrbitalDataResult {
  satellites: Satellite[];
  status: DataStatus;
  source: DataSourceInfo | undefined;
  fetchedAt: string | undefined;
  error: string | undefined;
  isFetching: boolean;
  refetch: () => void;
}

export function useSatelliteGroups(groups: TleGroup[], limit?: number): OrbitalDataResult {
  const fetchGroup = useServerFn(fetchTleGroup);
  const online = useOnline();
  const key = groups.join(",");

  const query = useQuery({
    queryKey: ["tle", key, limit ?? null],
    staleTime: FRESH_MS,
    gcTime: 24 * 3600_000,
    refetchInterval: FRESH_MS,
    retry: 1,
    queryFn: async (): Promise<TleFetchResult> => {
      const results = await Promise.allSettled(
        groups.map(async (group) => {
          const cacheKey = `${group}:${limit ?? "all"}`;
          try {
            const payload = await fetchGroup({
              data: { group, ...(limit ? { limit } : {}) },
            });
            writeCache(cacheKey, payload);
            return payload;
          } catch (error) {
            const cached = readCache(cacheKey);
            if (cached) {
              return {
                ...cached.payload,
                source: { ...cached.payload.source, cached: true },
              } satisfies TleFetchResult;
            }
            throw error;
          }
        }),
      );

      const ok = results.filter(
        (r): r is PromiseFulfilledResult<TleFetchResult> => r.status === "fulfilled",
      );
      if (ok.length === 0) {
        const reason = results[0];
        throw reason && reason.status === "rejected" && reason.reason instanceof Error
          ? reason.reason
          : new Error("Unable to retrieve element sets");
      }

      const seen = new Set<number>();
      const records = ok
        .flatMap((r) => r.value.records)
        .filter((r) => (seen.has(r.noradId) ? false : (seen.add(r.noradId), true)));
      const first = ok[0]!.value.source;
      return {
        records,
        source: { ...first, cached: ok.some((r) => r.value.source.cached) },
      };
    },
  });

  const satellites = useMemo(
    () => (query.data ? toSatellites(query.data) : []),
    [query.data],
  );

  const fetchedAt = query.data?.source.fetchedAt;
  const status = statusFor({
    fetchedAt,
    loading: query.isLoading,
    error: query.isError,
    online,
  });

  return {
    satellites,
    status,
    source: query.data?.source,
    fetchedAt,
    error: query.error instanceof Error ? query.error.message : undefined,
    isFetching: query.isFetching,
    refetch: () => void query.refetch(),
  };
}

/* ------------------------------------------------------------------ */
/* Live propagation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Propagates the given satellites locally on a timer. Keep the input list
 * short (tens of objects) — SGP4 runs on the main thread.
 */
export function useLiveStates(satellites: Satellite[], intervalMs = 1000): SatelliteState[] {
  const [states, setStates] = useState<SatelliteState[]>([]);
  const listRef = useRef(satellites);
  listRef.current = satellites;

  useEffect(() => {
    if (satellites.length === 0) {
      setStates([]);
      return;
    }
    let frame = 0;
    const tick = () => setStates(propagateMany(listRef.current, new Date()));
    tick();
    const id = window.setInterval(() => {
      // skip work while the tab is hidden
      if (document.visibilityState === "visible") tick();
    }, intervalMs);
    return () => {
      window.clearInterval(id);
      cancelAnimationFrame(frame);
    };
  }, [satellites, intervalMs]);

  return states;
}

/** A single ticking clock, shared by components that need "now". */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setNow(new Date());
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/* ------------------------------------------------------------------ */
/* Observer location                                                   */
/* ------------------------------------------------------------------ */

export const OBSERVER_PRESETS: ObserverLocation[] = [
  { name: "Athens, Greece", latitude: 37.9838, longitude: 23.7275, altitudeM: 70, source: "preset" },
  { name: "London, UK", latitude: 51.5072, longitude: -0.1276, altitudeM: 11, source: "preset" },
  { name: "New York, USA", latitude: 40.7128, longitude: -74.006, altitudeM: 10, source: "preset" },
  { name: "Tokyo, Japan", latitude: 35.6762, longitude: 139.6503, altitudeM: 40, source: "preset" },
  { name: "Sydney, Australia", latitude: -33.8688, longitude: 151.2093, altitudeM: 58, source: "preset" },
  { name: "Nairobi, Kenya", latitude: -1.2921, longitude: 36.8219, altitudeM: 1795, source: "preset" },
];

export const DEFAULT_OBSERVER: ObserverLocation = OBSERVER_PRESETS[0]!;

const OBSERVER_KEY = "orbital:observer";

export type GeoState = "idle" | "prompting" | "granted" | "denied" | "unavailable";

export interface ObserverResult {
  observer: ObserverLocation;
  geoState: GeoState;
  geoError: string | undefined;
  requestGeolocation: () => void;
  setObserver: (o: ObserverLocation) => void;
}

export function useObserver(): ObserverResult {
  const [observer, setObserverState] = useState<ObserverLocation>(DEFAULT_OBSERVER);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [geoError, setGeoError] = useState<string | undefined>(undefined);

  // restore after hydration only
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OBSERVER_KEY);
      if (raw) setObserverState(JSON.parse(raw) as ObserverLocation);
    } catch {
      /* ignore */
    }
  }, []);

  const setObserver = useCallback((o: ObserverLocation) => {
    setObserverState(o);
    try {
      window.localStorage.setItem(OBSERVER_KEY, JSON.stringify(o));
    } catch {
      /* ignore */
    }
  }, []);

  const requestGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("unavailable");
      setGeoError("This browser does not expose a geolocation API.");
      return;
    }
    setGeoState("prompting");
    setGeoError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("granted");
        setObserver({
          name: "My location",
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
          altitudeM: Math.round(pos.coords.altitude ?? 0),
          source: "geolocation",
        });
      },
      (err) => {
        setGeoState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — pick a city instead."
            : "Could not determine your location.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, [setObserver]);

  return { observer, geoState, geoError, requestGeolocation, setObserver };
}

/* ------------------------------------------------------------------ */
/* Favourites (NORAD ids — ready to sync to a user account later)      */
/* ------------------------------------------------------------------ */

const FAV_KEY = "orbital:favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(JSON.parse(raw) as number[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: number[]) => {
    setFavorites(next);
    try {
      window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    (noradId: number) =>
      persist(
        favorites.includes(noradId)
          ? favorites.filter((n) => n !== noradId)
          : [...favorites, noradId],
      ),
    [favorites, persist],
  );

  return { favorites, toggle, isFavorite: (n: number) => favorites.includes(n) };
}

/* ------------------------------------------------------------------ */
/* ISS crew                                                            */
/* ------------------------------------------------------------------ */

export function useIssCrew() {
  const fetchCrew = useServerFn(fetchIssCrew);
  const query = useQuery({
    queryKey: ["iss-crew"],
    staleTime: 6 * 3600_000,
    retry: 1,
    queryFn: () => fetchCrew(),
  });
  return {
    crew: query.data?.crew ?? [],
    source: query.data?.source,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : undefined,
  };
}
