import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PageHeader, Stat } from "@/components/Chrome";
import { DataErrorPanel, DataStatusBadge, LoadingPanel } from "@/components/DataStatus";
import { CategoryBadge } from "@/components/SatelliteCard";
import { ObserverPicker } from "@/components/ObserverPicker";
import { compass, lookAnglesAt, sunElevationDeg } from "@/services/satellite/satellitePropagation";
import {
  useNow,
  useObserver,
  useSatelliteGroups,
} from "@/services/satellite/useOrbitalData";
import type { OverheadSatellite } from "@/services/satellite/satelliteTypes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/above-me")({
  head: () => ({
    meta: [
      { title: "What's Above Me — ORBITAL" },
      {
        name: "description",
        content:
          "See every satellite currently above your horizon, calculated from your real location with live elevation, azimuth and range on a sky-dome radar.",
      },
      { property: "og:title", content: "What's Above Me — ORBITAL" },
      {
        property: "og:description",
        content: "Satellites above your horizon right now, calculated for your coordinates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboveMe,
});

const CATEGORY_FILTERS = [
  { id: "all", label: "All classes" },
  { id: "space-station", label: "Stations" },
  { id: "starlink", label: "Starlink" },
  { id: "navigation", label: "Navigation" },
  { id: "weather", label: "Weather" },
  { id: "science", label: "Science" },
  { id: "earth-observation", label: "Earth obs." },
] as const;

function AboveMe() {
  const data = useSatelliteGroups(
    ["stations", "starlink", "weather", "gnss", "science", "resource"],
    120,
  );
  const observerCtl = useObserver();
  const { observer } = observerCtl;
  const now = useNow(5000);
  const [nakedEyeOnly, setNakedEyeOnly] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]["id"]>("all");
  const [minElevation, setMinElevation] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const skyIsDark = useMemo(
    () => (now ? sunElevationDeg(observer, now) < -6 : false),
    [observer, now],
  );

  const overhead: OverheadSatellite[] = useMemo(() => {
    if (!now) return [];
    const out: OverheadSatellite[] = [];
    for (const sat of data.satellites) {
      // Strict horizon test: SGP4 → topocentric look angles for the observer's
      // exact geodetic position. Only elevation > 0° counts as "above me".
      const la = lookAnglesAt(sat, observer, now);
      if (!la || la.elevationDeg <= 0) continue;
      out.push({
        satellite: sat,
        elevationDeg: Number(la.elevationDeg.toFixed(1)),
        azimuthDeg: Number(la.azimuthDeg.toFixed(1)),
        rangeKm: Math.round(la.rangeKm),
        position: la.position,
        sunlit: la.sunlit,
        nakedEye:
          la.sunlit && skyIsDark && la.elevationDeg > 20 && la.position.altitudeKm < 1200,
      });
    }
    return out.sort((a, b) => b.elevationDeg - a.elevationDeg);
  }, [data.satellites, observer, now, skyIsDark]);

  const list = useMemo(
    () =>
      overhead.filter(
        (o) =>
          (!nakedEyeOnly || o.nakedEye) &&
          (category === "all" || o.satellite.category === category) &&
          o.elevationDeg >= minElevation,
      ),
    [overhead, nakedEyeOnly, category, minElevation],
  );


  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Sky dome"
        title="What's above me"
        description="A horizon-to-zenith radar of everything crossing your patch of sky right now, computed from your coordinates."
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

      <ObserverPicker className="mt-6" {...observerCtl} />

      {data.status === "error" && data.satellites.length === 0 ? (
        <div className="mt-10">
          <DataErrorPanel error={data.error} onRetry={data.refetch} />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,440px)_1fr]">
          {/* Radar */}
          <div className="panel rounded-3xl p-6">
            <SkyDome items={list} hovered={hovered} onHover={setHovered} />
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="In view" value={String(overhead.length)} />
              <Stat
                label="Naked eye"
                value={String(overhead.filter((o) => o.nakedEye).length)}
                hint={skyIsDark ? "sky is dark" : "daylight / twilight"}
              />
              <Stat label="Latitude" value={`${observer.latitude.toFixed(2)}°`} />
            </div>
          </div>

          {/* List */}
          <div>
            <div className="flex items-center justify-between">
              <p className="mono-label">{list.length} objects above horizon</p>
              <button
                onClick={() => setNakedEyeOnly((v) => !v)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  nakedEyeOnly
                    ? "border-signal bg-signal/15 text-signal"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {nakedEyeOnly ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Naked-eye only
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    category === c.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <label className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="mono-label shrink-0">Min elevation</span>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={minElevation}
                onChange={(e) => setMinElevation(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
              />
              <span className="w-10 text-right font-mono text-foreground">{minElevation}°</span>
            </label>


            {!now || (data.status === "loading" && overhead.length === 0) ? (
              <div className="mt-4">
                <LoadingPanel label="Propagating current positions…" />
              </div>
            ) : (
              <ul className="mt-4 grid gap-3">
                {list.map((o) => (
                  <li
                    key={o.satellite.id}
                    onMouseEnter={() => setHovered(o.satellite.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "panel flex flex-wrap items-center gap-4 rounded-2xl p-4 transition-colors",
                      hovered === o.satellite.id && "border-primary/60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/satellite/$id"
                        params={{ id: String(o.satellite.noradId) }}
                        className="block truncate font-display font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {o.satellite.name}
                      </Link>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <CategoryBadge category={o.satellite.category} />
                        {o.nakedEye && (
                          <span className="rounded-full border border-signal/40 bg-signal/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-signal uppercase">
                            Naked eye
                          </span>
                        )}
                        {!o.sunlit && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                            In shadow
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-right font-mono text-xs">
                      <div>
                        <p className="mono-label">Elev</p>
                        <p className="mt-1 text-foreground">{o.elevationDeg.toFixed(0)}°</p>
                      </div>
                      <div>
                        <p className="mono-label">Az</p>
                        <p className="mt-1 text-foreground">
                          {o.azimuthDeg.toFixed(0)}° {compass(o.azimuthDeg)}
                        </p>
                      </div>
                      <div>
                        <p className="mono-label">Range</p>
                        <p className="mt-1 text-foreground">{o.rangeKm.toLocaleString()} km</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {now && list.length === 0 && data.satellites.length > 0 && (
              <div className="panel mt-4 rounded-2xl p-10 text-center text-sm text-muted-foreground">
                Nothing above the horizon for this filter right now. Positions refresh every few
                seconds.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SkyDome({
  items,
  hovered,
  onHover,
}: {
  items: OverheadSatellite[];
  hovered: string | null;
  onHover: (id: string | null) => void;
}) {
  const size = 380;
  const r = size / 2 - 12;
  return (
    <div className="relative mx-auto" style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full">
        <defs>
          <radialGradient id="dome">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--background)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="url(#dome)" />
        {[1, 2, 3].map((i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={(r / 3) * i}
            fill="none"
            stroke="var(--border)"
            strokeDasharray={i === 3 ? undefined : "3 5"}
          />
        ))}
        <line x1={size / 2} y1={12} x2={size / 2} y2={size - 12} stroke="var(--border)" />
        <line x1={12} y1={size / 2} x2={size - 12} y2={size / 2} stroke="var(--border)" />
        {["N", "E", "S", "W"].map((d, i) => {
          const a = (i * 90 * Math.PI) / 180;
          return (
            <text
              key={d}
              x={size / 2 + Math.sin(a) * (r + 4)}
              y={size / 2 - Math.cos(a) * (r + 4) + 4}
              textAnchor="middle"
              fontSize="11"
              className="font-mono"
              fill="var(--muted-foreground)"
            >
              {d}
            </text>
          );
        })}
        {items.map((o) => {
          const rad = ((90 - o.elevationDeg) / 90) * r;
          const a = (o.azimuthDeg * Math.PI) / 180;
          const cx = size / 2 + Math.sin(a) * rad;
          const cy = size / 2 - Math.cos(a) * rad;
          const on = hovered === o.satellite.id;
          return (
            <g
              key={o.satellite.id}
              onMouseEnter={() => onHover(o.satellite.id)}
              onMouseLeave={() => onHover(null)}
              className="cursor-pointer"
            >
              {on && <circle cx={cx} cy={cy} r="12" fill="var(--primary)" opacity="0.2" />}
              <circle
                cx={cx}
                cy={cy}
                r={on ? 6 : o.nakedEye ? 4.5 : 3}
                fill={o.nakedEye ? "var(--signal)" : "var(--primary)"}
                opacity={o.sunlit ? 1 : 0.6}
              />
              {on && (
                <text x={cx + 10} y={cy - 8} fontSize="10" className="font-mono" fill="var(--foreground)">
                  {o.satellite.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
