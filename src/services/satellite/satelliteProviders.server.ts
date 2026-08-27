/**
 * Server-only orbital data providers.
 *
 * Provider-agnostic: every provider implements `TleProvider`. Providers that
 * require credentials read them from server environment variables inside the
 * request handler — no key ever reaches the browser.
 *
 * Resilience model (the public sources go down regularly):
 *   - every network call is bounded by a timeout and retried with exponential
 *     backoff + jitter, but only for transient failures (5xx / network)
 *   - a provider that keeps failing enters a cooldown so we stop hammering it
 *   - every group falls back through an ordered provider list independently,
 *     so one dead source or one dead group never takes the catalogue down
 *   - element sets are validated (parse + SGP4 + epoch age) before being served
 *   - a cached payload is served stale-while-revalidate rather than erroring
 *
 * Primary:  CelesTrak GP (public, no key, freely redistributable element sets)
 * Fallback: CelesTrak supplemental, then the public TLE API mirror
 * Optional: Space-Track (requires SPACETRACK_IDENTITY / SPACETRACK_PASSWORD)
 */

import { twoline2satrec, propagate } from "@/lib/satellitejs";

import type {
  CatalogIndexPayload,
  CatalogRow,
  TleFetchResult,
  TleGroup,
  TleProvider,
  TleRecord,
} from "./satelliteTypes";

const CELESTRAK_GROUP: Record<TleGroup, string> = {
  stations: "stations",
  starlink: "starlink",
  weather: "weather",
  gnss: "gnss",
  science: "science",
  resource: "resource",
};

/* ------------------------------------------------------------------ */
/* Transport: timeouts, bounded retries, friendly failures             */
/* ------------------------------------------------------------------ */

class ProviderError extends Error {
  readonly transient: boolean;
  readonly status: number | undefined;
  constructor(message: string, opts: { transient: boolean; status?: number }) {
    super(message);
    this.name = "ProviderError";
    this.transient = opts.transient;
    this.status = opts.status;
  }
}

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<string> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: ProviderError = new ProviderError("Request never ran", { transient: true });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "user-agent": "ORBITAL satellite tracker (contact: via app)",
          accept: "text/plain, application/json;q=0.9, */*;q=0.5",
          ...(init?.headers ?? {}),
        },
      });
      if (!res.ok) {
        const transient = res.status >= 500 || res.status === 429 || res.status === 408;
        throw new ProviderError(`Provider responded ${res.status}`, {
          transient,
          status: res.status,
        });
      }
      const text = await res.text();
      if (text.trim().length === 0) {
        throw new ProviderError("Provider returned an empty payload", { transient: true });
      }
      // CelesTrak answers 200 with this body when its sets have not regenerated.
      if (/GP data has not updated|Invalid query|No GP data found/i.test(text.slice(0, 400))) {
        throw new ProviderError("Provider declined the request (no fresh data)", {
          transient: false,
        });
      }
      return text;
    } catch (error) {
      lastError =
        error instanceof ProviderError
          ? error
          : new ProviderError(
              error instanceof Error && error.name === "TimeoutError"
                ? `Provider timed out after ${timeoutMs}ms`
                : error instanceof Error
                  ? error.message
                  : "Network failure",
              { transient: true },
            );
      if (!lastError.transient || attempt === MAX_ATTEMPTS) break;
      // exponential backoff with jitter: ~500ms, ~1.2s
      const backoff = 400 * 2 ** (attempt - 1);
      await sleep(backoff + Math.random() * 300);
    }
  }
  throw lastError;
}

/* ------------------------------------------------------------------ */
/* Element-set parsing + validation                                    */
/* ------------------------------------------------------------------ */

/** Parse a classic 3-line TLE listing. */
export function parseTleListing(text: string, group: TleGroup): TleRecord[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  const records: TleRecord[] = [];
  for (let i = 0; i + 2 < lines.length + 1; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!name || !l1 || !l2 || !l1.startsWith("1 ") || !l2.startsWith("2 ")) continue;
    const noradId = Number.parseInt(l1.slice(2, 7), 10);
    if (!Number.isFinite(noradId)) continue;
    const cospar = l1.slice(9, 17).trim();
    records.push({
      noradId,
      name: name.trim(),
      tle: { line1: l1, line2: l2 },
      ...(cospar ? { cosparId: normaliseCospar(cospar) } : {}),
      epoch: epochFromTle(l1),
      group,
    });
  }
  return records;
}

const MAX_EPOCH_AGE_MS = 45 * 86400_000;

/**
 * Real element sets only: anything that will not initialise in SGP4, will not
 * propagate to a finite state, or is older than 45 days is dropped rather than
 * shown as if it were current.
 */
export function validateRecords(records: TleRecord[]): TleRecord[] {
  const now = new Date();
  const cutoff = now.getTime() - MAX_EPOCH_AGE_MS;
  const kept: TleRecord[] = [];
  for (const record of records) {
    if (record.tle.line1.length < 60 || record.tle.line2.length < 60) continue;
    const epochMs = Date.parse(record.epoch);
    if (!Number.isFinite(epochMs) || epochMs < cutoff) continue;
    try {
      const satrec = twoline2satrec(record.tle.line1, record.tle.line2);
      if (satrec.error) continue;
      const state = propagate(satrec, now);
      const p = state?.position;
      if (!p || typeof p === "boolean") continue;
      if (![p.x, p.y, p.z].every((v) => Number.isFinite(v))) continue;
    } catch {
      continue;
    }
    kept.push(record);
  }
  return kept;
}

/** `98067A  ` -> `1998-067A` (the conventional COSPAR form). */
function normaliseCospar(raw: string): string {
  const m = /^(\d{2})(\d{3})([A-Z]*)$/.exec(raw.toUpperCase());
  if (!m) return raw;
  const yy = Number.parseInt(m[1]!, 10);
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  return `${year}-${m[2]}${m[3]}`;
}

function epochFromTle(line1: string): string {
  const raw = line1.slice(18, 32).trim();
  const yy = Number.parseInt(raw.slice(0, 2), 10);
  const doy = Number.parseFloat(raw.slice(2));
  if (!Number.isFinite(yy) || !Number.isFinite(doy)) return new Date().toISOString();
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const ms = Date.UTC(year, 0, 1) + (doy - 1) * 86400_000;
  return new Date(ms).toISOString();
}

function result(
  records: TleRecord[],
  provider: string,
  providerLabel: string,
): TleFetchResult {
  const valid = validateRecords(records);
  if (valid.length === 0) {
    throw new ProviderError("No usable element sets in the provider response", {
      transient: false,
    });
  }
  return {
    records: valid,
    source: {
      provider,
      providerLabel,
      fetchedAt: new Date().toISOString(),
      cached: false,
    },
  } satisfies TleFetchResult;
}

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

const celestrak: TleProvider = {
  id: "celestrak",
  label: "CelesTrak GP",
  requiresKey: false,
  isConfigured: () => true,
  async fetchGroup(group) {
    const text = await fetchText(
      `https://celestrak.org/NORAD/elements/gp.php?GROUP=${CELESTRAK_GROUP[group]}&FORMAT=tle`,
    );
    return result(parseTleListing(text, group), "celestrak", "CelesTrak GP");
  },
};

/**
 * CelesTrak supplemental sets. Operator-provided ephemerides, published for a
 * few constellations only. Used when the GP endpoint is unavailable or
 * declines a repeat request.
 */
const SUPPLEMENTAL_FILE: Partial<Record<TleGroup, string>> = { starlink: "starlink" };

const celestrakSupplemental: TleProvider = {
  id: "celestrak-supplemental",
  label: "CelesTrak supplemental",
  requiresKey: false,
  isConfigured: () => true,
  async fetchGroup(group) {
    const file = SUPPLEMENTAL_FILE[group];
    if (!file) {
      throw new ProviderError(`No supplemental set is published for ${group}`, {
        transient: false,
      });
    }
    const text = await fetchText(
      `https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=${file}&FORMAT=tle`,
    );
    return result(
      parseTleListing(text, group),
      "celestrak-supplemental",
      "CelesTrak supplemental",
    );
  },
};

/**
 * Independent public mirror of the same NORAD element sets (JSON API, no key).
 * Queried by name family, which is how it exposes constellations — bounded to
 * a couple of pages per family so a fallback never becomes a bulk download.
 */
const MIRROR_QUERIES: Record<TleGroup, string[]> = {
  stations: ["ISS (ZARYA)", "CSS (TIANHE)", "PROGRESS", "SOYUZ", "CREW DRAGON"],
  starlink: ["STARLINK"],
  weather: ["NOAA", "METOP", "GOES", "METEOR"],
  gnss: ["NAVSTAR", "GALILEO", "COSMOS 24", "BEIDOU"],
  science: ["HST", "TESS", "SWIFT", "XMM", "FERMI"],
  resource: ["LANDSAT", "SENTINEL", "TERRA", "AQUA", "SPOT"],
};

const MIRROR_PAGES: Partial<Record<TleGroup, number>> = { starlink: 3 };

interface MirrorPayload {
  member?: Array<{ satelliteId?: number; name?: string; line1?: string; line2?: string }>;
}

const tleMirror: TleProvider = {
  id: "tle-api-mirror",
  label: "Public TLE API mirror",
  requiresKey: false,
  isConfigured: () => true,
  async fetchGroup(group) {
    const pages = MIRROR_PAGES[group] ?? 1;
    const seen = new Set<number>();
    const records: TleRecord[] = [];

    for (const query of MIRROR_QUERIES[group]) {
      for (let page = 1; page <= pages; page += 1) {
        let payload: MirrorPayload;
        try {
          const text = await fetchText(
            `https://tle.ivanstanojevic.me/api/tle/?search=${encodeURIComponent(query)}&page-size=100&page=${page}`,
            { timeoutMs: 15_000 },
          );
          payload = JSON.parse(text) as MirrorPayload;
        } catch {
          break; // this family is unavailable; try the next one
        }
        const members = payload.member ?? [];
        if (members.length === 0) break;
        for (const m of members) {
          if (!m.line1 || !m.line2 || !m.satelliteId || seen.has(m.satelliteId)) continue;
          seen.add(m.satelliteId);
          const cospar = m.line1.slice(9, 17).trim();
          records.push({
            noradId: m.satelliteId,
            name: (m.name ?? `NORAD ${m.satelliteId}`).trim(),
            tle: { line1: m.line1, line2: m.line2 },
            ...(cospar ? { cosparId: normaliseCospar(cospar) } : {}),
            epoch: epochFromTle(m.line1),
            group,
          });
        }
      }
    }

    return result(records, "tle-api-mirror", "Public TLE API mirror");
  },
};

const SPACETRACK_QUERY: Record<TleGroup, string> = {
  stations: "OBJECT_NAME/~~ISS,CSS",
  starlink: "OBJECT_NAME/~~STARLINK",
  weather: "OBJECT_NAME/~~NOAA,METOP",
  gnss: "OBJECT_NAME/~~NAVSTAR,GALILEO,GLONASS,BEIDOU",
  science: "OBJECT_NAME/~~HST,TESS,SWIFT",
  resource: "OBJECT_NAME/~~LANDSAT,SENTINEL,TERRA,AQUA",
};

const spacetrack: TleProvider = {
  id: "spacetrack",
  label: "Space-Track.org",
  requiresKey: true,
  isConfigured: () =>
    Boolean(process.env["SPACETRACK_IDENTITY"] && process.env["SPACETRACK_PASSWORD"]),
  async fetchGroup(group) {
    const identity = process.env["SPACETRACK_IDENTITY"];
    const password = process.env["SPACETRACK_PASSWORD"];
    if (!identity || !password) {
      throw new ProviderError("Space-Track credentials are not configured", {
        transient: false,
      });
    }

    const login = await fetch("https://www.space-track.org/ajaxauth/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ identity, password }).toString(),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!login.ok) {
      throw new ProviderError(`Space-Track login failed (${login.status})`, {
        transient: login.status >= 500,
        status: login.status,
      });
    }
    const cookie = login.headers.get("set-cookie") ?? "";

    const text = await fetchText(
      `https://www.space-track.org/basicspacedata/query/class/gp/${SPACETRACK_QUERY[group]}/orderby/NORAD_CAT_ID/format/3le`,
      { headers: { cookie } },
    );
    return result(
      parseTleListing(text.replace(/^0 /gm, ""), group),
      "spacetrack",
      "Space-Track.org",
    );
  },
};

/** Ordered by preference; unconfigured or cooling-down providers are skipped. */
export const PROVIDERS: TleProvider[] = [
  celestrak,
  spacetrack,
  celestrakSupplemental,
  tleMirror,
];

/* ------------------------------------------------------------------ */
/* Provider health: back off from sources that are down                */
/* ------------------------------------------------------------------ */

const health = new Map<string, { failures: number; cooldownUntil: number }>();

function isCoolingDown(id: string): boolean {
  const h = health.get(id);
  return Boolean(h && Date.now() < h.cooldownUntil);
}

function noteFailure(id: string) {
  const h = health.get(id) ?? { failures: 0, cooldownUntil: 0 };
  h.failures += 1;
  // 30s, 1m, 2m … capped at 10 minutes. Only after two strikes.
  h.cooldownUntil =
    h.failures >= 2 ? Date.now() + Math.min(30_000 * 2 ** (h.failures - 2), 600_000) : 0;
  health.set(id, h);
}

function noteSuccess(id: string) {
  health.set(id, { failures: 0, cooldownUntil: 0 });
}

/* ------------------------------------------------------------------ */
/* Server-side cache, stale-while-revalidate                           */
/* ------------------------------------------------------------------ */

const FRESH_TTL_MS = 4 * 60 * 60 * 1000;
/** How long a cached payload stays servable once it is no longer fresh. */
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const cache = new Map<TleGroup, { at: number; payload: TleFetchResult }>();
const inflight = new Map<TleGroup, Promise<TleFetchResult | null>>();

/** Human-readable summary of why a group could not be retrieved. */
function friendlyFailure(group: TleGroup): string {
  return `Live element sets for ${group} are unavailable right now — the public orbital data providers are not responding.`;
}

async function fetchFresh(group: TleGroup): Promise<TleFetchResult | null> {
  const existing = inflight.get(group);
  if (existing) return existing;

  const task = (async () => {
    for (const provider of PROVIDERS) {
      if (!provider.isConfigured() || isCoolingDown(provider.id)) continue;
      try {
        const payload = await provider.fetchGroup(group);
        noteSuccess(provider.id);
        cache.set(group, { at: Date.now(), payload });
        return payload;
      } catch (error) {
        noteFailure(provider.id);
        console.warn(
          `[orbital] provider ${provider.id} failed for ${group}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    return null;
  })().finally(() => inflight.delete(group));

  inflight.set(group, task);
  return task;
}

function cachedPayload(entry: { at: number; payload: TleFetchResult }): TleFetchResult {
  return { ...entry.payload, source: { ...entry.payload.source, cached: true } };
}

export async function getGroup(group: TleGroup, limit?: number): Promise<TleFetchResult> {
  const hit = cache.get(group);
  const now = Date.now();

  if (hit && now - hit.at < FRESH_TTL_MS) {
    return withLimit(cachedPayload(hit), limit);
  }

  // Stale but usable: serve immediately and refresh in the background.
  if (hit && now - hit.at < STALE_TTL_MS) {
    void fetchFresh(group);
    return withLimit(cachedPayload(hit), limit);
  }

  const fresh = await fetchFresh(group);
  if (fresh) return withLimit(fresh, limit);

  const fallback = cache.get(group);
  if (fallback) return withLimit(cachedPayload(fallback), limit);

  throw new Error(friendlyFailure(group));
}

function withLimit(payload: TleFetchResult, limit?: number): TleFetchResult {
  if (!limit || payload.records.length <= limit) return payload;
  return { ...payload, records: payload.records.slice(0, limit) };
}

/* ------------------------------------------------------------------ */
/* ISS crew (real, from the public open-notify mirror)                 */
/* ------------------------------------------------------------------ */

interface CrewPayload {
  iss_expedition?: number;
  people?: Array<{
    name?: string;
    agency?: string;
    country?: string;
    position?: string;
    spacecraft?: string;
    days_in_space?: number;
    iss?: boolean;
  }>;
}

let crewCache: { at: number; payload: CrewPayload } | null = null;

export async function getIssCrew() {
  const now = Date.now();
  if (!crewCache || now - crewCache.at > 6 * 3600_000) {
    try {
      const text = await fetchText(
        "https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json",
      );
      crewCache = { at: now, payload: JSON.parse(text) as CrewPayload };
    } catch (error) {
      if (!crewCache) {
        console.warn("[orbital] crew manifest unavailable:", error);
        throw new Error("The station crew manifest is unavailable right now.");
      }
    }
  }
  const people = crewCache.payload.people ?? [];
  return {
    expedition: crewCache.payload.iss_expedition ?? null,
    crew: people
      .filter((p) => p.iss === true)
      .map((p) => ({
        name: p.name ?? "Unknown",
        craft: p.spacecraft ?? "ISS",
        agency: p.agency ?? p.country ?? "",
        role: p.position ?? "",
        daysAboard: p.days_in_space ?? 0,
      })),
    source: {
      provider: "iss-apis",
      providerLabel: "International Space Station APIs",
      fetchedAt: new Date(crewCache.at).toISOString(),
      cached: now - crewCache.at > 1000,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Catalog index — identifiers for every object we can retrieve.       */
/* Deliberately free of positional data: nothing is propagated here.   */
/* ------------------------------------------------------------------ */

export const ALL_GROUPS: TleGroup[] = [
  "stations",
  "starlink",
  "weather",
  "gnss",
  "science",
  "resource",
];

export async function getCatalogIndex(): Promise<CatalogIndexPayload> {
  const failedGroups: TleGroup[] = [];
  const seen = new Set<number>();
  const rows: CatalogRow[] = [];
  let fetchedAt = new Date(0).toISOString();
  let cached = true;
  let providerLabel = "CelesTrak GP";
  let provider = "celestrak";

  const settled = await Promise.allSettled(
    ALL_GROUPS.map(async (group) => ({ group, payload: await getGroup(group) })),
  );

  for (const [i, result_] of settled.entries()) {
    const group = ALL_GROUPS[i]!;
    if (result_.status === "rejected") {
      failedGroups.push(group);
      continue;
    }
    const { payload } = result_.value;
    if (payload.source.fetchedAt > fetchedAt) fetchedAt = payload.source.fetchedAt;
    if (!payload.source.cached) cached = false;
    provider = payload.source.provider;
    providerLabel = payload.source.providerLabel;
    for (const r of payload.records) {
      if (seen.has(r.noradId)) continue;
      seen.add(r.noradId);
      rows.push({
        noradId: r.noradId,
        name: r.name,
        ...(r.cosparId ? { cosparId: r.cosparId } : {}),
        group: r.group,
        epoch: r.epoch,
      });
    }
  }

  if (rows.length === 0) {
    throw new Error(
      "No orbital data could be retrieved — every public element-set provider is unreachable right now.",
    );
  }

  return {
    rows,
    source: { provider, providerLabel, fetchedAt, cached },
    failedGroups,
  };
}

/**
 * Full element sets for a handful of NORAD ids. Used when the user actually
 * selects an object — we never ship every TLE to the browser for search.
 */
export async function getRecordsByIds(ids: number[]): Promise<TleFetchResult> {
  const wanted = new Set(ids);
  const records: TleRecord[] = [];
  let source: TleFetchResult["source"] | null = null;

  for (const group of ALL_GROUPS) {
    if (wanted.size === 0) break;
    let payload: TleFetchResult;
    try {
      payload = await getGroup(group);
    } catch {
      continue;
    }
    source ??= payload.source;
    for (const r of payload.records) {
      if (wanted.delete(r.noradId)) records.push(r);
    }
  }

  if (!source) {
    throw new Error(
      "No element sets could be retrieved — the orbital data providers are unavailable.",
    );
  }
  return { records, source };
}
