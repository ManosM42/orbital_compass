import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sun, Moon, CloudSun, Loader2 } from "lucide-react";
import { PageHeader, Stat } from "@/components/Chrome";
import { DataErrorPanel, DataStatusBadge } from "@/components/DataStatus";
import { ObserverPicker } from "@/components/ObserverPicker";
import { compass, formatDay, formatTime } from "@/services/satellite/satellitePropagation";
import { usePassPredictions } from "@/services/satellite/usePassPredictions";
import {
  useFavorites,
  useObserver,
  useSatelliteGroups,
} from "@/services/satellite/useOrbitalData";
import type { PassPrediction } from "@/services/satellite/satelliteTypes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/passes")({
  head: () => ({
    meta: [
      { title: "Pass Predictions — ORBITAL" },
      {
        name: "description",
        content:
          "Upcoming satellite passes calculated with SGP4 for your exact location: rise and peak times, max elevation, range and illumination.",
      },
      { property: "og:title", content: "Pass Predictions — ORBITAL" },
      {
        property: "og:description",
        content: "Upcoming flyovers calculated for your coordinates with peak times and elevation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Passes,
});

const QUALITIES = ["all", "excellent", "good", "fair"] as const;
/** Pass searches are CPU-bound; cap how many objects we scan at once. */
const MAX_SCAN = 14;

function Passes() {
  const data = useSatelliteGroups(["stations", "science", "resource", "weather"], 60);
  const observerCtl = useObserver();
  const { observer } = observerCtl;
  const { favorites } = useFavorites();

  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("all");
  const [visibleOnly, setVisibleOnly] = useState(false);
  const [days, setDays] = useState(3);

  const scanList = useMemo(() => {
    const favs = data.satellites.filter((s) => favorites.includes(s.noradId));
    const rest = data.satellites.filter((s) => !favorites.includes(s.noradId));
    return [...favs, ...rest].slice(0, MAX_SCAN);
  }, [data.satellites, favorites]);

  const { passes, computing, progress } = usePassPredictions(scanList, observer, {
    hours: days * 24,
    minElevationDeg: 10,
  });

  const list = passes.filter(
    (p) =>
      (quality === "all" || p.quality === quality) &&
      (!visibleOnly || p.visibility === "visible"),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, PassPrediction[]>();
    for (const p of list) {
      const key = formatDay(p.startTime);
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()];
  }, [list]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Forecast"
        title="Upcoming passes"
        description="Every flyover worth stepping outside for, calculated locally from published element sets for your coordinates."
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mono-label">Quality</span>
        {QUALITIES.map((q) => (
          <button
            key={q}
            onClick={() => setQuality(q)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs capitalize transition-colors",
              quality === q
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {q}
          </button>
        ))}
        <button
          onClick={() => setVisibleOnly((v) => !v)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            visibleOnly
              ? "border-signal bg-signal/15 text-signal"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Visible only
        </button>
        {[1, 3, 7].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              days === d
                ? "border-plasma bg-plasma/15 text-plasma"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {d}-day window
          </button>
        ))}
      </div>

      {data.status === "error" && data.satellites.length === 0 ? (
        <div className="mt-10">
          <DataErrorPanel error={data.error} onRetry={data.refetch} />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Passes" value={String(list.length)} />
            <Stat
              label="Best elevation"
              value={list.length ? `${Math.max(...list.map((p) => p.maxElevationDeg))}°` : "—"}
            />
            <Stat
              label="Closest approach"
              value={list.length ? `${Math.min(...list.map((p) => p.peakRangeKm))} km` : "—"}
            />
            <Stat label="Window" value={`${days} day${days > 1 ? "s" : ""}`} />
          </div>

          {computing && (
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Propagating {scanList.length} objects — {Math.round(progress * 100)}%
            </p>
          )}

          <div className="mt-10 space-y-10">
            {grouped.map(([day, items]) => (
              <section key={day}>
                <h2 className="font-display text-lg font-semibold text-foreground">{day}</h2>
                <ul className="mt-4 grid gap-3">
                  {items.map((p) => (
                    <PassRow key={p.id} pass={p} />
                  ))}
                </ul>
              </section>
            ))}
            {!computing && grouped.length === 0 && (
              <div className="panel rounded-2xl p-10 text-center text-sm text-muted-foreground">
                No passes above 10° match these filters in the next {days} day
                {days > 1 ? "s" : ""}.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PassRow({ pass }: { pass: PassPrediction }) {
  const VisIcon =
    pass.visibility === "visible" ? Moon : pass.visibility === "daylight" ? Sun : CloudSun;
  const tone =
    pass.quality === "excellent"
      ? "text-signal border-signal/40 bg-signal/10"
      : pass.quality === "good"
        ? "text-primary border-primary/40 bg-primary/10"
        : "text-muted-foreground border-border bg-secondary/50";

  return (
    <li className="panel grid gap-4 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 sm:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] sm:items-center">
      <div className="min-w-0">
        <p className="truncate font-display font-semibold text-foreground">{pass.satelliteName}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              tone,
            )}
          >
            {pass.quality}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground capitalize">
            <VisIcon className="h-3 w-3" /> {pass.visibility}
          </span>
        </div>
      </div>

      <Cell label="Starts" value={`${formatTime(pass.startTime)} · ${compass(pass.startAzimuthDeg)}`} />
      <Cell label="Peak" value={`${formatTime(pass.peakTime)} · ${pass.maxElevationDeg}°`} />
      <Cell label="Ends" value={`${formatTime(pass.endTime)} · ${compass(pass.endAzimuthDeg)}`} />
      <Cell
        label="Duration / Range"
        value={`${Math.floor(pass.durationSec / 60)}m ${pass.durationSec % 60}s · ${pass.peakRangeKm} km`}
      />

      <div className="sm:col-span-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-plasma"
            style={{ width: `${Math.min(100, (pass.maxElevationDeg / 90) * 100)}%` }}
          />
        </div>
      </div>
    </li>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mono-label">{label}</p>
      <p className="mt-1 font-mono text-xs text-foreground">{value}</p>
    </div>
  );
}
