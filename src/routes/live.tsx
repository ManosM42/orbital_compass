import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, Radio, Satellite as SatIcon, Video, ExternalLink } from "lucide-react";

import { PageHeader, Stat } from "@/components/Chrome";
import { DataErrorPanel, DataStatusBadge } from "@/components/DataStatus";
import { CategoryBadge } from "@/components/SatelliteCard";
import { Note } from "@/components/solar/BodyUI";
import { ObserverPicker } from "@/components/ObserverPicker";
import { compass, lookAnglesAt } from "@/services/satellite/satellitePropagation";
import {
  useLiveStates,
  useNow,
  useObserver,
  useSatelliteGroups,
} from "@/services/satellite/useOrbitalData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Orbital Activity — ORBITAL" },
      {
        name: "description",
        content:
          "A real-time orbital activity hub: element-set freshness, live SGP4 state for tracked spacecraft, objects currently above your horizon and live space video feeds.",
      },
      { property: "og:title", content: "Live Orbital Activity — ORBITAL" },
      {
        property: "og:description",
        content: "Live SGP4 state, provider freshness and live video streams right from space.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveHub,
});

function LiveHub() {
  const data = useSatelliteGroups(["stations", "science", "weather", "gnss", "starlink"], 80);
  const observerCtl = useObserver();
  const { observer } = observerCtl;
  const now = useNow(1000);

  const tracked = useMemo(() => data.satellites.slice(0, 60), [data.satellites]);
  const states = useLiveStates(tracked, 1000);

  const overhead = useMemo(() => {
    if (!now) return [];
    return states
      .map((s) => ({ state: s, look: lookAnglesAt(s.satellite, observer, now) }))
      .filter((r) => r.look && r.look.elevationDeg > 0)
      .sort((a, b) => (b.look?.elevationDeg ?? 0) - (a.look?.elevationDeg ?? 0));
  }, [states, observer, now]);

  const sunlit = states.filter((s) => s.sunlit).length;
  const fastest = states.reduce(
    (max, s) => Math.max(max, s.position.velocityKmS),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Live"
        title="Orbital activity, right now"
        description="Everything on this page is computed in your browser from the most recent published element sets, accompanied by live feeds directly from orbit."
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
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Objects propagating"
              value={states.length.toLocaleString()}
              hint="local SGP4, 1 Hz"
            />
            <Stat label="Above your horizon" value={String(overhead.length)} hint="elevation > 0°" />
            <Stat label="In sunlight" value={`${sunlit}/${states.length || 0}`} />
            <Stat
              label="Fastest tracked"
              value={fastest ? `${fastest.toFixed(2)} km/s` : "—"}
            />
          </div>

          <ObserverPicker className="mt-8" {...observerCtl} />

          {/* Live Video Feeds & NASA Banner Section */}
          <h2 className="mt-10 flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Video className="h-4 w-4 text-primary" /> Live video from orbit &amp; Channels
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Live video streams from space cameras and official channel redirection.
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {/* ISS 4K Livestream (Autoplaying embedded) */}
            <div className="panel overflow-hidden rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between pb-3">
                <span className="mono-label text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />
                  ISS 4K Live Earth View
                </span>
                <span className="text-xs text-muted-foreground">Sen / ISS</span>
              </div>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                <iframe
                  className="absolute inset-0 h-full w-full border-0"
                  src="https://www.youtube-nocookie.com/embed/fO9e9jnhYK8?autoplay=1&mute=1&enablejsapi=1"
                  title="ISS Live 4K Earth View"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Live 4K video stream of Earth captured by Sen's cameras aboard the ISS.
              </p>
            </div>

            {/* NASA Public Channel Banner Card (Redirects to YouTube) */}
            <a
              href="https://www.youtube.com/watch?v=26WmpoMXwSY"
              target="_blank"
              rel="noopener noreferrer"
              className="panel group relative overflow-hidden rounded-2xl p-4 flex flex-col transition-all duration-300 hover:border-primary/60 hover:shadow-lg"
            >
              <div className="flex items-center justify-between pb-3 z-10">
                <span className="mono-label text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />
                  NASA Public Channel
                </span>
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  Watch on YouTube <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
              
              {/* YouTube Style Banner Graphic Container */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                {/* Background decorative glow elements */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent opacity-75 group-hover:scale-105 transition-transform duration-500" />
                
                {/* NASA Meatball/Logo representation & Banner styling */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg border border-white/20 mb-3 group-hover:scale-105 transition-transform">
                    <span className="font-display font-black text-white tracking-tighter text-lg">NASA</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-white tracking-wide">
                    NASA Public Channel
                  </h3>
                  <p className="mt-1 text-xs text-blue-200 max-w-xs">
                    Official broadcasts, live spacewalks, missions, and documentaries.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-transform group-hover:scale-105">
                    <Radio className="h-3.5 w-3.5" /> Open YouTube Stream
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Clicking this banner will open the official NASA live broadcast directly on YouTube.
              </p>
            </a>
          </div>

          <h2 className="mt-10 flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Activity className="h-4 w-4 text-primary" /> Live state feed
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Values recomputed every second from element sets, not streamed from a server.
          </p>

          <div className="panel mt-4 overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="px-4 py-3 font-normal"><span className="mono-label">Object</span></th>
                  <th className="px-4 py-3 font-normal"><span className="mono-label">Class</span></th>
                  <th className="px-4 py-3 text-right font-normal"><span className="mono-label">Alt</span></th>
                  <th className="px-4 py-3 text-right font-normal"><span className="mono-label">Vel</span></th>
                  <th className="px-4 py-3 text-right font-normal"><span className="mono-label">Lat / Lon</span></th>
                  <th className="px-4 py-3 text-right font-normal"><span className="mono-label">Elev</span></th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {states.slice(0, 24).map((s) => {
                  const look = now ? lookAnglesAt(s.satellite, observer, now) : null;
                  const up = (look?.elevationDeg ?? -1) > 0;
                  return (
                    <tr
                      key={s.satellite.id}
                      className="border-b border-border/40 last:border-0 hover:bg-secondary/40"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          to="/satellite/$id"
                          params={{ id: String(s.satellite.noradId) }}
                          className="font-sans text-foreground transition-colors hover:text-primary"
                        >
                          {s.satellite.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <CategoryBadge category={s.satellite.category} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground">
                        {s.position.altitudeKm.toFixed(0)} km
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground">
                        {s.position.velocityKmS.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {s.position.latitude.toFixed(1)}°, {s.position.longitude.toFixed(1)}°
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right",
                          up ? "text-signal" : "text-muted-foreground",
                        )}
                      >
                        {look ? `${look.elevationDeg.toFixed(0)}° ${compass(look.azimuthDeg)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
                {states.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center font-sans text-muted-foreground">
                      Waiting for element sets…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="mt-10 flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Radio className="h-4 w-4 text-primary" /> Feeds
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-1">
            <div className="panel rounded-2xl p-6">
              <p className="mono-label">Orbital element feed</p>
              <p className="mt-2 font-display text-lg text-foreground">
                {data.source ? data.source.providerLabel : "Connecting"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Published general-perturbation element sets, retrieved server-side, cached, and
                propagated locally. This is a real, verified feed — it is what drives every number
                on this page.
              </p>
            </div>
          </div>

          <h2 className="mt-10 flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <SatIcon className="h-4 w-4 text-primary" /> Over you right now
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overhead.slice(0, 9).map(({ state, look }) => (
              <Link
                key={state.satellite.id}
                to="/satellite/$id"
                params={{ id: String(state.satellite.noradId) }}
                className="panel rounded-2xl p-4 transition-colors hover:border-primary/60"
              >
                <p className="truncate font-display font-semibold text-foreground">
                  {state.satellite.name}
                </p>
                <p className="mono-label mt-2 text-[10px]">
                  {look!.elevationDeg.toFixed(0)}° elev · {compass(look!.azimuthDeg)} ·{" "}
                  {Math.round(look!.rangeKm).toLocaleString()} km
                </p>
              </Link>
            ))}
            {overhead.length === 0 && (
              <p className="panel col-span-full rounded-2xl p-8 text-center text-sm text-muted-foreground">
                Nothing from the tracked subset is above your horizon at this instant.
              </p>
            )}
          </div>

          <Note>
            The live subset is capped at 60 objects so SGP4 stays smooth on the main thread; the
            full catalog remains searchable from the tracker. Cached element sets are labelled as
            cached, and a failed retrieval is labelled as failed — never rendered as live.
          </Note>
        </>
      )}
    </div>
  );
}