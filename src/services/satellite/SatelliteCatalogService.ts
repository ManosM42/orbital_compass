/**
 * SatelliteCatalogService — provider-independent catalog access.
 *
 * Responsibilities:
 *  - retrieve the identifier-only catalog index (no positions, no TLEs)
 *  - join it with curated/inferred metadata
 *  - hydrate full element sets on demand, for the few objects a user selects
 *
 * It knows nothing about React, Three.js or any renderer, and nothing about
 * which provider served the data — loaders are injected.
 */

import { metaFor, constellationFor } from "./satelliteCatalog";
import type {
  CatalogEntry,
  CatalogIndexPayload,
  DataSourceInfo,
  Satellite,
  TleFetchResult,
  TleGroup,
} from "./satelliteTypes";

export type CatalogState = "idle" | "loading" | "ready" | "error";

export interface CatalogSnapshot {
  state: CatalogState;
  entries: CatalogEntry[];
  source: DataSourceInfo | undefined;
  fetchedAt: string | undefined;
  /** true when served from the local (offline) index cache. */
  fromLocalCache: boolean;
  failedGroups: TleGroup[];
  error: string | undefined;
}

export type IndexLoader = () => Promise<CatalogIndexPayload>;
export type RecordLoader = (ids: number[]) => Promise<TleFetchResult>;

const CACHE_KEY = "orbital:catalog-index";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface CachedIndex {
  storedAt: string;
  payload: CatalogIndexPayload;
}

function readLocal(): CachedIndex | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedIndex;
    if (!entry?.payload?.rows?.length) return null;
    if (Date.now() - Date.parse(entry.storedAt) > CACHE_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeLocal(payload: CatalogIndexPayload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ storedAt: new Date().toISOString(), payload } satisfies CachedIndex),
    );
  } catch {
    /* quota / private mode — memory copy still applies */
  }
}

function toEntries(payload: CatalogIndexPayload): CatalogEntry[] {
  return payload.rows.map((row) => {
    const meta = metaFor(row.noradId, row.name, row.group);
    const constellation = constellationFor(row.name);
    return {
      noradId: row.noradId,
      name: row.name,
      ...(row.cosparId ? { cosparId: row.cosparId } : {}),
      operator: meta.operator,
      country: meta.country,
      category: meta.category,
      ...(constellation ? { constellation } : {}),
      group: row.group,
      epoch: row.epoch,
    } satisfies CatalogEntry;
  });
}

function toSatellite(record: TleFetchResult["records"][number]): Satellite {
  const meta = metaFor(record.noradId, record.name, record.group);
  const constellation = constellationFor(record.name);
  return {
    id: `sat-${record.noradId}`,
    noradId: record.noradId,
    name: record.name,
    operator: meta.operator,
    country: meta.country,
    category: meta.category,
    ...(meta.launchDate ? { launchDate: meta.launchDate } : {}),
    ...(meta.description ? { description: meta.description } : {}),
    ...(record.cosparId ? { cosparId: record.cosparId } : {}),
    ...(constellation ? { constellation } : {}),
    tle: record.tle,
    epoch: record.epoch,
    group: record.group,
  } satisfies Satellite;
}

const EMPTY: CatalogSnapshot = {
  state: "idle",
  entries: [],
  source: undefined,
  fetchedAt: undefined,
  fromLocalCache: false,
  failedGroups: [],
  error: undefined,
};

class CatalogService {
  private snap: CatalogSnapshot = EMPTY;
  private listeners = new Set<(s: CatalogSnapshot) => void>();
  private inflight: Promise<CatalogSnapshot> | null = null;
  private indexLoader: IndexLoader | null = null;
  private recordLoader: RecordLoader | null = null;
  private satellites = new Map<number, Satellite>();
  private pending = new Map<number, Promise<Satellite | null>>();

  /** Inject the transport. Called once by the React layer. */
  configure(loaders: { index: IndexLoader; records: RecordLoader }) {
    this.indexLoader = loaders.index;
    this.recordLoader = loaders.records;
  }

  getSnapshot(): CatalogSnapshot {
    return this.snap;
  }

  subscribe(listener: (s: CatalogSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(next: Partial<CatalogSnapshot>) {
    this.snap = { ...this.snap, ...next };
    for (const l of this.listeners) l(this.snap);
  }

  /** Idempotent: concurrent callers share one network round trip. */
  load(force = false): Promise<CatalogSnapshot> {
    if (!force && this.snap.state === "ready") return Promise.resolve(this.snap);
    if (this.inflight) return this.inflight;

    const loader = this.indexLoader;
    if (!loader) return Promise.resolve(this.snap);

    this.emit({ state: "loading", error: undefined });

    this.inflight = (async () => {
      try {
        const payload = await loader();
        writeLocal(payload);
        this.emit({
          state: "ready",
          entries: toEntries(payload),
          source: payload.source,
          fetchedAt: payload.source.fetchedAt,
          fromLocalCache: false,
          failedGroups: payload.failedGroups,
          error: undefined,
        });
      } catch (error) {
        const cached = readLocal();
        if (cached) {
          this.emit({
            state: "ready",
            entries: toEntries(cached.payload),
            source: { ...cached.payload.source, cached: true },
            fetchedAt: cached.payload.source.fetchedAt,
            fromLocalCache: true,
            failedGroups: cached.payload.failedGroups,
            error: error instanceof Error ? error.message : "Catalog retrieval failed",
          });
        } else {
          this.emit({
            state: "error",
            error: error instanceof Error ? error.message : "Catalog retrieval failed",
          });
        }
      } finally {
        this.inflight = null;
      }
      return this.snap;
    })();

    return this.inflight;
  }

  /** Already-hydrated element set, if we have one. */
  peek(noradId: number): Satellite | null {
    return this.satellites.get(noradId) ?? null;
  }

  /** Hydrates the real element set for one object, on demand. */
  async getSatellite(noradId: number): Promise<Satellite | null> {
    const hit = this.satellites.get(noradId);
    if (hit) return hit;
    const pending = this.pending.get(noradId);
    if (pending) return pending;

    const loader = this.recordLoader;
    if (!loader) return null;

    const task = (async () => {
      try {
        const payload = await loader([noradId]);
        const record = payload.records.find((r) => r.noradId === noradId);
        if (!record) return null;
        const sat = toSatellite(record);
        this.satellites.set(noradId, sat);
        return sat;
      } catch {
        return null;
      } finally {
        this.pending.delete(noradId);
      }
    })();

    this.pending.set(noradId, task);
    return task;
  }

  /** Lets pages that already hold element sets share them with the service. */
  prime(satellites: Satellite[]) {
    for (const s of satellites) if (!this.satellites.has(s.noradId)) this.satellites.set(s.noradId, s);
  }
}

export const satelliteCatalogService = new CatalogService();
