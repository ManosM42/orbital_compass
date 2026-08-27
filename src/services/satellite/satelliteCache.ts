/**
 * Client-side TLE cache.
 *
 * Element sets change slowly (providers publish a few times per day), so we
 * cache them in localStorage and keep propagating locally while offline.
 * Freshness is surfaced to the UI through `statusFor`.
 */

import type { DataStatus, TleFetchResult } from "./satelliteTypes";

const PREFIX = "orbital:tle:";
/** Refetch after this age. */
export const FRESH_MS = 2 * 60 * 60 * 1000; // 2h
/** Beyond this age element sets are flagged as stale in the UI. */
export const STALE_MS = 12 * 60 * 60 * 1000; // 12h

export interface CacheEntry {
  storedAt: string;
  payload: TleFetchResult;
}

const memory = new Map<string, CacheEntry>();

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCache(key: string): CacheEntry | null {
  const mem = memory.get(key);
  if (mem) return mem;
  const raw = storage()?.getItem(PREFIX + key);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry?.payload?.records?.length) return null;
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

export function writeCache(key: string, payload: TleFetchResult): CacheEntry {
  const entry: CacheEntry = { storedAt: new Date().toISOString(), payload };
  memory.set(key, entry);
  try {
    storage()?.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota or private mode — memory cache still applies */
  }
  return entry;
}

export function ageMs(iso: string, now = Date.now()): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : Math.max(0, now - t);
}

export function isFresh(entry: CacheEntry | null, now = Date.now()): boolean {
  return !!entry && ageMs(entry.storedAt, now) < FRESH_MS;
}

export interface FreshnessInput {
  fetchedAt?: string | undefined;
  loading: boolean;
  error: boolean;
  online: boolean;
}

export function statusFor({ fetchedAt, loading, error, online }: FreshnessInput): DataStatus {
  if (!fetchedAt) return loading ? "loading" : error ? "error" : "loading";
  const age = ageMs(fetchedAt);
  if (!online) return "offline";
  if (error && age > FRESH_MS) return "stale";
  if (age > STALE_MS) return "stale";
  return "live";
}

export function formatAge(iso: string | undefined): string {
  if (!iso) return "—";
  const ms = ageMs(iso);
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}
