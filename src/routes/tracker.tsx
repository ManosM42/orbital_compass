import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Star, SlidersHorizontal } from "lucide-react";
import { Globe3D } from "@/components/globe3d/Globe3D";
import { PageHeader, Stat } from "@/components/Chrome";
import { DataErrorPanel, DataStatusBadge, LoadingPanel } from "@/components/DataStatus";
import { SatelliteCard, CategoryBadge } from "@/components/SatelliteCard";
import { SatelliteSearch } from "@/components/SatelliteSearch";
import { satelliteCatalogService } from "@/services/satellite/SatelliteCatalogService";
import { CATEGORY_LABELS } from "@/services/satellite/satelliteCatalog";
import {
  apsides,
  groundTrack,
  inclinationDeg,
  orbitalPeriodMin,
} from "@/services/satellite/satellitePropagation";
import {
  useFavorites,
  useLiveStates,
  useNow,
  useSatelliteGroups,
} from "@/services/satellite/useOrbitalData";
import type { Satellite, SatelliteCategory } from "@/services/satellite/satelliteTypes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tracker")({
  head: () => ({
    meta: [
      { title: "Satellite Tracker — ORBITAL" },
      {
        name: "description",
        content:
          "Search, filter and follow real satellites on an interactive globe. Live SGP4 altitude, velocity, inclination and published TLE data for every tracked object.",
      },
      { property: "og:title", content: "Satellite Tracker — ORBITAL" },
      {
        property: "og:description",
        content: "Search, filter and follow real satellites on an interactive globe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tracker,
});

const CATEGORIES = Object.keys(CATEGORY_LABELS) as SatelliteCategory[];
/** Keep propagation on the main thread bounded. */
const MAX_LIVE = 60;

function Tracker() {
  const data = useSatelliteGroups(
    ["stations", "starlink", "weather", "gnss", "science", "resource"],
    150,
  );
  const now = useNow(60_000);
  const { favorites, toggle, isFavorite } = useFavorites();

  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<SatelliteCategory[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Objects pulled in individually from the catalogue search. */
  const [extra, setExtra] = useState<Satellite[]>([]);

  // Share already-retrieved element sets so search selection needs no refetch.
  useEffect(() => {
    if (data.satellites.length > 0) satelliteCatalogService.prime(data.satellites);
  }, [data.satellites]);

  const all = useMemo(() => {
    const seen = new Set(extra.map((s) => s.noradId));
    return [...extra, ...data.satellites.filter((s) => !seen.has(s.noradId))];
  }, [extra, data.satellites]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.operator.toLowerCase().includes(q) ||
        String(s.noradId).includes(q);
      const matchC = cats.length === 0 || cats.includes(s.category);
      const matchF = !onlyFavorites || favorites.includes(s.noradId);
      return matchQ && matchC && matchF;
    });
  }, [all, query, cats, onlyFavorites, favorites]);

  const active: Satellite | undefined =
    all.find((s) => s.id === selectedId) ?? results[0];

  const liveList = useMemo(() => {
    const head = results.slice(0, MAX_LIVE);
    // The selected object is always propagated, even when filtered out.
    return active && !head.some((s) => s.id === active.id) ? [active, ...head] : head;
  }, [results, active]);
  const states = useLiveStates(liveList, 1000);
  const stateById = useMemo(() => new Map(states.map((s) => [s.satellite.id, s])), [states]);

  const activeState = active ? stateById.get(active.id) : undefined;

  const trail = useMemo(() => (active && now ? groundTrack(active, now) : []), [active, now]);

  const toggleCat = (c: SatelliteCategory) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Live catalogue"
        title="Satellite tracker"
        description="Filter published element sets, pin your favourites and watch selected objects move across the globe in real time."
      />

      <DataStatusBadge
        className="mt-6"
        status={data.status}
        source={data.source}
        fetchedAt={data.fetchedAt}
        error={data.error}
        isFetching={data.isFetching}
        onRefresh={data.refetch}
      />

      {data.status === "error" && data.satellites.length === 0 ? (
        <div className="mt-10">
          <DataErrorPanel error={data.error} onRetry={data.refetch} />
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          {/* Globe + readout */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="panel rounded-3xl p-6">
              <Globe3D
                className="aspect-square w-full"
                states={states}
                selectedId={active?.id ?? null}
                onSelect={(s) => setSelectedId(s?.id ?? null)}
                trail={trail}
                now={now}
              />

              {active && (
                <div className="border-t border-border/60 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        {active.name}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {active.operator}
                        {active.launchDate ? ` · launched ${active.launchDate}` : ""} · element set{" "}
                        {new Date(active.epoch).toLocaleDateString()}
                      </p>
                    </div>
                    <CategoryBadge category={active.category} />
                  </div>
                  {active.description && (
                    <p className="mt-3 text-sm text-muted-foreground">{active.description}</p>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat
                      label="Altitude"
                      value={
                        activeState ? `${Math.round(activeState.position.altitudeKm)} km` : "—"
                      }
                    />
                    <Stat
                      label="Velocity"
                      value={
                        activeState ? `${activeState.position.velocityKmS.toFixed(2)} km/s` : "—"
                      }
                    />
                    <Stat
                      label="Inclination"
                      value={`${(inclinationDeg(active) ?? 0).toFixed(2)}°`}
                    />
                    <Stat
                      label="Period"
                      value={`${(orbitalPeriodMin(active) ?? 0).toFixed(1)} min`}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Stat
                      label="Apogee"
                      value={`${Math.round(apsides(active)?.apogeeKm ?? 0)} km`}
                    />
                    <Stat
                      label="Perigee"
                      value={`${Math.round(apsides(active)?.perigeeKm ?? 0)} km`}
                    />
                  </div>
                  <details className="mt-4 rounded-2xl bg-secondary/50 p-4">
                    <summary className="mono-label cursor-pointer">Two-line element set</summary>
                    <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {active.tle.line1}
                      {"\n"}
                      {active.tle.line2}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>

          {/* Search + list */}
          <div>
            <div className="panel rounded-3xl p-5">
              <SatelliteSearch
                className="mb-4"
                onSelect={(sat) => {
                  setExtra((prev) =>
                    prev.some((s) => s.noradId === sat.noradId) ? prev : [sat, ...prev],
                  );
                  setSelectedId(sat.id);
                  setQuery("");
                  setCats([]);
                  setOnlyFavorites(false);
                }}
              />
              <label className="relative block">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter the loaded groups…"
                  className="w-full rounded-full border border-input bg-background/60 py-3 pr-4 pl-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mono-label flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3 w-3" /> Filter
                </span>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCat(c)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      cats.includes(c)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
                <button
                  onClick={() => setOnlyFavorites((v) => !v)}
                  className={cn(
                    "ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    onlyFavorites
                      ? "border-ember bg-ember/15 text-ember"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Star className={cn("h-3 w-3", onlyFavorites && "fill-current")} />
                  Favourites ({favorites.length})
                </button>
              </div>
            </div>

            <p className="mono-label mt-6">
              {results.length} objects
              {results.length > MAX_LIVE ? ` · live telemetry for the first ${MAX_LIVE}` : ""}
            </p>

            {data.status === "loading" && results.length === 0 ? (
              <div className="mt-3">
                <LoadingPanel />
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {results.slice(0, 120).map((s) => (
                  <SatelliteCard
                    key={s.id}
                    satellite={s}
                    position={stateById.get(s.id)?.position}
                    selected={active?.id === s.id}
                    favorite={isFavorite(s.noradId)}
                    onSelect={() => setSelectedId(s.id)}
                    onToggleFavorite={() => toggle(s.noradId)}
                  />
                ))}
              </div>
            )}

            {data.status !== "loading" && results.length === 0 && (
              <div className="panel mt-3 rounded-2xl p-10 text-center text-sm text-muted-foreground">
                No objects match those filters.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
