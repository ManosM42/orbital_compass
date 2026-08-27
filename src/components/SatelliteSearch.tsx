/**
 * Catalog autocomplete.
 *
 * Searches the full indexed catalog (identifiers only — nothing is propagated
 * to answer a query). Selecting a result hydrates that one real element set
 * and hands the object back to the caller, which selects it on the globe.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatAge } from "@/services/satellite/satelliteCache";
import { useOnline } from "@/services/satellite/useOrbitalData";
import { useSatelliteLoader, useSatelliteSearch } from "@/services/satellite/useCatalog";
import { CATEGORY_LABELS } from "@/services/satellite/satelliteCatalog";
import type { Satellite } from "@/services/satellite/satelliteTypes";
import type { MatchField } from "@/services/satellite/SatelliteSearchService";

const FIELD_LABEL: Record<MatchField, string> = {
  name: "name",
  norad: "NORAD",
  cospar: "COSPAR",
  operator: "operator",
  country: "country",
  constellation: "constellation",
  type: "type",
};

/** Only ever renders a value we actually have. */
function Field({ label, value }: { label: string; value: string | undefined }) {
  return (
    <span className="font-mono text-[10px] text-muted-foreground">
      {label} {value ? <span className="text-foreground/80">{value}</span> : <span className="opacity-60">data unavailable</span>}
    </span>
  );
}

export function SatelliteSearch({
  onSelect,
  className,
  placeholder = "Search the catalogue — name, NORAD, COSPAR, operator…",
}: {
  onSelect: (sat: Satellite) => void;
  className?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const online = useOnline();

  const { results, catalog, indexedCount, isPending } = useSatelliteSearch(query);
  const { load, loadingId, error: loadError } = useSatelliteLoader();

  useEffect(() => setCursor(0), [results]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const freshness = useMemo(() => {
    if (catalog.state === "loading") return { tone: "text-muted-foreground", text: "Indexing catalogue…" };
    if (catalog.state === "error")
      return { tone: "text-destructive", text: catalog.error ?? "Catalogue unavailable" };
    if (!online)
      return { tone: "text-ember", text: `Offline — cached index · updated ${formatAge(catalog.fetchedAt)}` };
    if (catalog.fromLocalCache)
      return { tone: "text-ember", text: `Stale index (local cache) · updated ${formatAge(catalog.fetchedAt)}` };
    return {
      tone: "text-signal",
      text: `Live index · ${indexedCount.toLocaleString()} objects · updated ${formatAge(catalog.fetchedAt)}`,
    };
  }, [catalog, online, indexedCount]);

  const choose = async (noradId: number) => {
    const sat = await load(noradId);
    if (sat) {
      onSelect(sat);
      setOpen(false);
      setQuery("");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[cursor];
      if (hit) void choose(hit.entry.noradId);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <label className="relative block">
        <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls="catalog-results"
          aria-label="Search the satellite catalogue"
          className="w-full rounded-full border border-input bg-background/60 py-3 pr-10 pl-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      <p className={cn("mt-2 font-mono text-[10px]", freshness.tone)}>{freshness.text}</p>
      {loadError && <p className="mt-1 text-[11px] text-destructive">{loadError}</p>}

      {open && query.trim().length > 0 && (
        <div
          id="catalog-results"
          role="listbox"
          className="panel absolute z-40 mt-2 max-h-[22rem] w-full overflow-y-auto rounded-2xl p-1.5"
        >
          {catalog.state !== "ready" ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {catalog.state === "error"
                ? catalog.error ?? "The catalogue could not be retrieved."
                : "Building the catalogue index…"}
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {isPending ? "Searching…" : "No catalogued object matches that."}
            </p>
          ) : (
            results.map((hit, i) => {
              const e = hit.entry;
              return (
                <button
                  key={e.noradId}
                  role="option"
                  aria-selected={i === cursor}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => void choose(e.noradId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    i === cursor ? "bg-secondary" : "hover:bg-secondary/60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-foreground">{e.name}</span>
                      <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                        {FIELD_LABEL[hit.matchedOn]}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <Field label="NORAD" value={String(e.noradId)} />
                      <Field label="COSPAR" value={e.cosparId} />
                      <Field label="OP" value={e.operator === "Unknown operator" ? undefined : e.operator} />
                      <Field label="TYPE" value={CATEGORY_LABELS[e.category]} />
                    </div>
                  </div>
                  {loadingId === e.noradId && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
