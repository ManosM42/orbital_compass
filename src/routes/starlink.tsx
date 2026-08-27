import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader, Stat } from "@/components/Chrome";
import { Globe } from "@/components/Globe";
import { SatelliteCard } from "@/components/SatelliteCard";
import { DataErrorPanel, DataStatusBadge, LoadingPanel } from "@/components/DataStatus";
import { apsides, groundTrack, inclinationDeg } from "@/services/satellite/satellitePropagation";
import {
  useFavorites,
  useLiveStates,
  useNow,
  useSatelliteGroups,
} from "@/services/satellite/useOrbitalData";
import type { Satellite } from "@/services/satellite/satelliteTypes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/starlink")({
  head: () => ({
    meta: [
      { title: "Starlink Constellation — ORBITAL" },
      {
        name: "description",
        content:
          "Explore the Starlink constellation shell by shell from live element sets: altitudes, inclinations, orbital planes and real satellite positions.",
      },
      { property: "og:title", content: "Starlink Constellation — ORBITAL" },
      {
        property: "og:description",
        content: "Shell-by-shell view of Starlink from live element sets, with real positions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Starlink,
});

const MAX_LIVE = 60;
/** Shells are derived from the retrieved element sets, not hard-coded. */
const SHELL_BIN = 0.5;

function Starlink() {
  const data = useSatelliteGroups(["starlink"], 400);
  const now = useNow(60_000);
  const { toggle, isFavorite } = useFavorites();

  const [shell, setShell] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const withInclination = useMemo(
    () =>
      data.satellites.map((s) => {
        const inc = inclinationDeg(s) ?? 0;
        return {
          sat: s,
          inc,
          apogee: apsides(s)?.apogeeKm ?? 0,
          shellId: (Math.round(inc / SHELL_BIN) * SHELL_BIN).toFixed(1),
        };
      }),
    [data.satellites],
  );

  const shells = useMemo(() => {
    const map = new Map<string, { inc: number; alts: number[] }>();
    for (const r of withInclination) {
      const entry = map.get(r.shellId) ?? { inc: Number(r.shellId), alts: [] };
      entry.alts.push(r.apogee);
      map.set(r.shellId, entry);
    }
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        inclinationDeg: v.inc,
        count: v.alts.length,
        altitudeKm: v.alts.reduce((a, b) => a + b, 0) / v.alts.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [withInclination]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withInclination
      .filter(
        (r) => (shell === "all" || r.shellId === shell) && r.sat.name.toLowerCase().includes(q),
      )
      .map((r) => r.sat);
  }, [withInclination, shell, query]);

  const liveList = useMemo(() => list.slice(0, MAX_LIVE), [list]);
  const states = useLiveStates(liveList, 2000);
  const stateById = useMemo(() => new Map(states.map((s) => [s.satellite.id, s])), [states]);

  const active: Satellite | undefined = list.find((s) => s.id === selectedId) ?? list[0];
  const trail = useMemo(() => (active && now ? groundTrack(active, now) : []), [active, now]);

  const meanAltitude = useMemo(() => {
    const alts = states.map((s) => s.position.altitudeKm);
    return alts.length ? alts.reduce((a, b) => a + b, 0) / alts.length : 0;
  }, [states]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Constellation"
        title="Starlink"
        description="The largest constellation ever flown, grouped by orbital shell from live element sets — and where each relay is right now."
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
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Element sets retrieved"
              value={data.satellites.length.toLocaleString()}
              hint="latest published set"
            />
            <Stat label="Matching filter" value={list.length.toLocaleString()} />
            <Stat
              label="Mean altitude"
              value={meanAltitude ? `${Math.round(meanAltitude)} km` : "—"}
              hint={`live for ${states.length} objects`}
            />
            <Stat
              label="Shells"
              value={String(shells.length)}
              hint="detected from inclinations"
            />
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div className="panel rounded-3xl p-6 lg:sticky lg:top-24 lg:self-start">
              <div className="flex justify-center pb-16">
                <Globe
                  states={states.slice(0, 40)}
                  selectedId={active?.id}
                  onSelect={(s) => setSelectedId(s.id)}
                  trail={trail}
                  size={320}
                />
              </div>
              <h2 className="mono-label border-t border-border/60 pt-5">Orbital shells</h2>
              <ul className="mt-4 space-y-3">
                {shells.slice(0, 6).map((sh) => {
                  const count = sh.count;
                  const pct = data.satellites.length
                    ? Math.min(100, (count / data.satellites.length) * 100)
                    : 0;
                  return (
                    <li key={sh.id}>
                      <button
                        onClick={() => setShell(shell === sh.id ? "all" : sh.id)}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition-colors",
                          shell === sh.id
                            ? "border-primary/70 bg-primary/10"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm font-semibold text-foreground">
                            ~{Math.round(sh.altitudeKm)} km · {sh.inclinationDeg.toFixed(1)}°
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {count.toLocaleString()} tracked
                          </span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-aurora"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                          {pct.toFixed(1)}% of retrieved element sets
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <label className="panel relative flex items-center rounded-full px-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Starlink relays…"
                  className="w-full bg-transparent py-3 pl-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
              <p className="mono-label mt-6">
                {list.length} relays
                {list.length > MAX_LIVE ? ` · live telemetry for the first ${MAX_LIVE}` : ""}
              </p>

              {data.status === "loading" && list.length === 0 ? (
                <div className="mt-3">
                  <LoadingPanel />
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {list.slice(0, 120).map((s) => (
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

              {data.status !== "loading" && list.length === 0 && (
                <div className="panel mt-3 rounded-2xl p-10 text-center text-sm text-muted-foreground">
                  No relays in this shell match your search.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
