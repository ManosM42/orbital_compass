/**
 * SatelliteSearchService — an in-memory search index over the catalog.
 *
 * Pure data: no React, no renderer, no provider knowledge. It indexes every
 * identifier a user might type (name, NORAD id, COSPAR id, operator, country,
 * constellation, category/type) and answers prefix queries in sub-millisecond
 * time so autocomplete can be immediate.
 *
 * Nothing here propagates an orbit — searching never computes a position.
 */

import { CATEGORY_LABELS } from "./satelliteCatalog";
import type { CatalogEntry } from "./satelliteTypes";

export type MatchField =
  | "name"
  | "norad"
  | "cospar"
  | "operator"
  | "country"
  | "constellation"
  | "type";

export interface SearchHit {
  entry: CatalogEntry;
  score: number;
  /** Which identifier caused the match — surfaced in the UI. */
  matchedOn: MatchField;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  const n = normalise(value);
  return n.length === 0 ? [] : n.split(" ");
}

interface IndexedEntry {
  entry: CatalogEntry;
  /** token -> field, for scoring */
  fields: { token: string; field: MatchField }[];
  nameKey: string;
}

export class SatelliteSearchService {
  private items: IndexedEntry[] = [];
  /** sorted token list for binary-searched prefix lookups */
  private sortedTokens: { token: string; item: number; field: MatchField }[] = [];
  private byNorad = new Map<number, IndexedEntry>();
  private version = 0;

  /** Rebuilds the index. O(n log n); ~10k objects builds in a few ms. */
  build(entries: CatalogEntry[]): void {
    const items: IndexedEntry[] = [];
    const flat: { token: string; item: number; field: MatchField }[] = [];
    this.byNorad.clear();

    entries.forEach((entry) => {
      const fields: IndexedEntry["fields"] = [];
      const push = (raw: string | undefined, field: MatchField) => {
        if (!raw) return;
        for (const t of tokens(raw)) fields.push({ token: t, field });
      };

      push(entry.name, "name");
      push(String(entry.noradId), "norad");
      push(entry.cosparId, "cospar");
      push(entry.operator, "operator");
      push(entry.country, "country");
      push(entry.constellation, "constellation");
      push(CATEGORY_LABELS[entry.category], "type");

      const item: IndexedEntry = { entry, fields, nameKey: normalise(entry.name) };
      const idx = items.push(item) - 1;
      this.byNorad.set(entry.noradId, item);
      const seen = new Set<string>();
      for (const f of fields) {
        const key = `${f.token}|${f.field}`;
        if (seen.has(key)) continue;
        seen.add(key);
        flat.push({ token: f.token, item: idx, field: f.field });
      }
    });

    flat.sort((a, b) => (a.token < b.token ? -1 : a.token > b.token ? 1 : 0));
    this.items = items;
    this.sortedTokens = flat;
    this.version += 1;
  }

  get size(): number {
    return this.items.length;
  }

  get indexVersion(): number {
    return this.version;
  }

  getByNorad(noradId: number): CatalogEntry | null {
    return this.byNorad.get(noradId)?.entry ?? null;
  }

  /** First index whose token is >= prefix. */
  private lowerBound(prefix: string): number {
    let lo = 0;
    let hi = this.sortedTokens.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedTokens[mid]!.token < prefix) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * Ranked matches for a raw query. All query terms must match (AND), each by
   * token prefix, so "starlink 30" narrows as you type.
   */
  search(query: string, limit = 12): SearchHit[] {
    const terms = tokens(query);
    if (terms.length === 0) return [];

    let candidates: Map<number, { score: number; field: MatchField }> | null = null;

    for (const term of terms) {
      const found = new Map<number, { score: number; field: MatchField }>();
      for (let i = this.lowerBound(term); i < this.sortedTokens.length; i++) {
        const row = this.sortedTokens[i]!;
        if (!row.token.startsWith(term)) break;
        const exact = row.token === term;
        const base =
          (row.field === "norad" ? 60 : row.field === "name" ? 50 : row.field === "cospar" ? 45 : 25) +
          (exact ? 40 : Math.max(0, 20 - (row.token.length - term.length)));
        const prev = found.get(row.item);
        if (!prev || prev.score < base) found.set(row.item, { score: base, field: row.field });
      }
      if (candidates === null) {
        candidates = found;
      } else {
        const merged = new Map<number, { score: number; field: MatchField }>();
        for (const [item, v] of found) {
          const prev = candidates.get(item);
          if (prev) merged.set(item, { score: prev.score + v.score, field: prev.field });
        }
        candidates = merged;
      }
      if (candidates.size === 0) return [];
    }

    const joined = normalise(query);
    const hits: SearchHit[] = [];
    for (const [item, v] of candidates!) {
      const indexed = this.items[item]!;
      let score = v.score;
      if (indexed.nameKey === joined) score += 120;
      else if (indexed.nameKey.startsWith(joined)) score += 60;
      // shorter names rank first among equally good prefix matches
      score -= Math.min(20, indexed.nameKey.length / 4);
      hits.push({ entry: indexed.entry, score, matchedOn: v.field });
    }

    hits.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
    return hits.slice(0, limit);
  }
}

export const satelliteSearchService = new SatelliteSearchService();
