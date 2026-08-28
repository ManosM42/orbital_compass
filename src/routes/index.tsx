import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Radar, Satellite, Sparkles, Signal, Rocket } from "lucide-react";
import { Globe3D } from "@/components/globe3d/Globe3D";
import { Stat } from "@/components/Chrome";
import { DataStatusBadge } from "@/components/DataStatus";
import { ISS_NORAD_ID } from "@/services/satellite/satelliteCatalog";
import { groundTrack, inclinationDeg } from "@/services/satellite/satellitePropagation";
import { useLiveStates, useNow, useSatelliteGroups } from "@/services/satellite/useOrbitalData";
import type { Satellite as Sat } from "@/services/satellite/satelliteTypes";
import ArcadeGame from "@/components/ArcadeGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ORBITAL — Watch the Sky in Real Time" },
      {
        name: "description",
        content:
          "ORBITAL is a cinematic satellite-tracking console: a live globe driven by real orbital element sets, ISS telemetry, Starlink trains and calculated pass predictions for your location.",
      },
      { property: "og:title", content: "ORBITAL — Watch the Sky in Real Time" },
      {
        property: "og:description",
        content: "A live globe, ISS telemetry, Starlink trains and calculated passes for your sky.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    icon: Radar,
    title: "Live tracking",
    body: "Real element sets propagated locally with SGP4, projected onto an interactive Earth.",
  },
  {
    icon: Sparkles,
    title: "Pass predictions",
    body: "Passes calculated for your exact coordinates — rise, peak, set and illumination.",
  },
  {
    icon: Signal,
    title: "Starlink trains",
    body: "Catch freshly deployed strings of satellites before they disperse into their shells.",
  },
  {
    icon: Rocket,
    title: "Mission telemetry",
    body: "Altitude, velocity, inclination and the current crew aboard the station overhead.",
  },
];

function Home() {
  const data = useSatelliteGroups(["stations", "science", "resource"], 40);
  const now = useNow(30_000);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Guarantee ISS is always included and prioritized in the featured states slice
  const featured = useMemo(() => {
    const list = [...data.satellites];
    const issIndex = list.findIndex((s) => s.noradId === ISS_NORAD_ID);
    if (issIndex > -1) {
      const [iss] = list.splice(issIndex, 1);
      list.unshift(iss); // Put ISS at the very front
    }
    return list.slice(0, 16);
  }, [data.satellites]);

  const states = useLiveStates(featured, 1000);

  /**
   * `selectedId` is the single source of truth for the selection. It is seeded
   * once, when live states first arrive, and after that only user interaction
   * changes it — closing the panel genuinely deselects instead of falling back
   * to a derived default that would immediately re-open it.
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || states.length === 0) return;
    const iss = data.satellites.find((s) => s.noradId === ISS_NORAD_ID);
    const initial = iss?.id ?? states[0]?.satellite.id ?? null;
    if (!initial) return;
    seeded.current = true;
    setSelectedId(initial);
  }, [data.satellites, states]);

  const active = states.find((s) => s.satellite.id === selectedId) ?? null;

  const trail = useMemo(() => {
    if (!active || !now) return [];
    return groundTrack(active.satellite, now);
  }, [active, now]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-14 pb-28 sm:px-6 sm:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.25fr] lg:gap-14">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {data.satellites.length > 0
                ? `${data.satellites.length.toLocaleString()} objects propagating locally`
                : "Connecting to orbital data"}
            </span>
            <h1 className="mt-6 text-4xl leading-[1.05] font-bold text-foreground sm:text-6xl lg:text-7xl">
              The sky above you,
              <br />
              <span className="bg-gradient-to-r from-primary via-aurora to-plasma bg-clip-text text-transparent">
                fully mapped.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              ORBITAL pulls published orbital element sets and propagates them in your browser with
              SGP4. Spin the globe, pick a spacecraft, and get the exact minute it crosses your
              horizon.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/tracker"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
              >
                Open the tracker
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/above-me"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                What's above me now
              </Link>
            </div>

            <DataStatusBadge
              className="mt-8"
              status={data.status}
              source={data.source}
              fetchedAt={data.fetchedAt}
              error={data.error}
              isFetching={data.isFetching}
              onRefresh={data.refetch}
            />
          </div>

          <Globe3D
            className="aspect-square w-full min-h-[320px] sm:min-h-[440px] lg:aspect-auto lg:h-[min(84vh,820px)] landscape:max-lg:aspect-auto landscape:max-lg:h-[min(78vh,460px)]"
            fill={0.84}
            states={states}
            selectedId={selectedId}
            onSelect={(s: Sat | null) => setSelectedId(s?.id ?? null)}
            trail={trail}
            now={now}
          />
        </div>
      </section>

      {/* Selected readout */}
      {active && (
        <section className="px-4 sm:px-6">
          <div className="panel mx-auto flex max-w-7xl flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mono-label">Selected object</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-foreground">
                {active.satellite.name}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {active.satellite.description ??
                  `${active.satellite.operator} · NORAD ${active.satellite.noradId}`}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:w-80">
              <Stat label="Lat" value={`${active.position.latitude.toFixed(1)}°`} />
              <Stat label="Lon" value={`${active.position.longitude.toFixed(1)}°`} />
              <Stat label="Incl" value={`${(inclinationDeg(active.satellite) ?? 0).toFixed(1)}°`} />
            </div>
          </div>
        </section>
      )}

      {/* Features & Capabilities */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="mono-label">Capabilities</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold text-foreground sm:text-4xl">
            Built for people who look up.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="panel group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>

          {/* Interactive Arcade Mini-Game Section */}
          <div className="mt-16">
            <ArcadeGame />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="panel glow-ring mx-auto max-w-7xl overflow-hidden rounded-3xl p-10 text-center sm:p-16">
          <Satellite className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-6 text-3xl font-bold text-foreground sm:text-4xl">
            Never miss a flyover again.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Set your location once. ORBITAL keeps a running schedule of everything worth stepping
            outside for.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/passes"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
            >
              See tonight's passes
            </Link>
            <Link
              to="/pricing"
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Compare plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}