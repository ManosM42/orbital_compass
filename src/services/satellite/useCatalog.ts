/**
 * React bindings for the renderer-independent catalog + search services.
 *
 * The services own the data and the index; these hooks only wire up the
 * transport (server functions), subscriptions and debouncing.
 */

import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { fetchCatalogIndex, fetchSatelliteRecords } from "./satelliteApi";
import {
  satelliteCatalogService,
  type CatalogSnapshot,
} from "./SatelliteCatalogService";
import { satelliteSearchService, type SearchHit } from "./SatelliteSearchService";
import type { Satellite } from "./satelliteTypes";

/* Rebuild the search index whenever the catalog changes — once per app. */
let indexBound = false;
function bindSearchIndex() {
  if (indexBound) return;
  indexBound = true;
  let lastEntries = satelliteCatalogService.getSnapshot().entries;
  if (lastEntries.length > 0) satelliteSearchService.build(lastEntries);
  satelliteCatalogService.subscribe((snap) => {
    if (snap.entries === lastEntries) return;
    lastEntries = snap.entries;
    satelliteSearchService.build(snap.entries);
  });
}

const SERVER_SNAPSHOT: CatalogSnapshot = satelliteCatalogService.getSnapshot();

/** Configures transport + subscribes to the catalog. Safe to call anywhere. */
export function useCatalog(autoLoad = true): CatalogSnapshot & { reload: () => void } {
  const loadIndex = useServerFn(fetchCatalogIndex);
  const loadRecords = useServerFn(fetchSatelliteRecords);

  satelliteCatalogService.configure({
    index: () => loadIndex(),
    records: (ids: number[]) => loadRecords({ data: { ids } }),
  });
  bindSearchIndex();

  const snapshot = useSyncExternalStore(
    (cb) => satelliteCatalogService.subscribe(cb),
    () => satelliteCatalogService.getSnapshot(),
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    if (autoLoad) void satelliteCatalogService.load();
  }, [autoLoad]);

  const reload = useCallback(() => void satelliteCatalogService.load(true), []);

  return { ...snapshot, reload };
}

/** Debounced autocomplete over the whole indexed catalog. */
export function useSatelliteSearch(query: string, limit = 12, debounceMs = 110) {
  const catalog = useCatalog();
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    if (query.trim().length === 0) {
      setDebounced(query);
      return;
    }
    const id = window.setTimeout(() => setDebounced(query), debounceMs);
    return () => window.clearTimeout(id);
  }, [query, debounceMs]);

  const results: SearchHit[] = useMemo(() => {
    if (catalog.state !== "ready") return [];
    return satelliteSearchService.search(debounced, limit);
    // `entries` participates so results refresh when the index rebuilds
  }, [debounced, limit, catalog.state, catalog.entries]);

  return {
    results,
    catalog,
    indexedCount: catalog.entries.length,
    /** the user typed something we have not searched for yet */
    isPending: debounced !== query,
  };
}

/**
 * Loads the real element set for a NORAD id on demand — only ever called when
 * the user actually selects a search result.
 */
export function useSatelliteLoader() {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const load = useCallback(async (noradId: number): Promise<Satellite | null> => {
    setLoadingId(noradId);
    setError(undefined);
    const sat = await satelliteCatalogService.getSatellite(noradId);
    if (mounted.current) {
      setLoadingId(null);
      if (!sat) setError("The element set for this object could not be retrieved.");
    }
    return sat;
  }, []);

  return { load, loadingId, error };
}
