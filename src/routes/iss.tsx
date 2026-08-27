import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, Orbit } from "lucide-react";
import { PageHeader, Stat } from "@/components/Chrome";
import { Globe3D } from "@/components/globe3d/Globe3D";
import { DataErrorPanel, DataStatusBadge, LoadingPanel } from "@/components/DataStatus";
import { ObserverPicker } from "@/components/ObserverPicker";
import { ISS_FACTS } from "@/lib/site-content";
import { ISS_NORAD_ID } from "@/services/satellite/satelliteCatalog";
import {
  apsides,
  compass,
  formatDay,
  formatTime,
  groundTrack,
  inclinationDeg,
  orbitalPeriodMin,
} from "@/services/satellite/satellitePropagation";
import { usePassPredictions } from "@/services/satellite/usePassPredictions";
import {
  useIssCrew,
  useLiveStates,
  useNow,
  useObserver,
  useSatelliteGroups,
} from "@/services/satellite/useOrbitalData";

export const Route = createFileRoute("/iss")({
  head: () => ({
    meta: [
      { title: "International Space Station Live — ORBITAL" },
      {
        name: "description",
        content:
          "Live ISS position, altitude and velocity propagated from published element sets, the current crew manifest, station vitals and calculated visible passes over your city.",
      },
      { property: "og:title", content: "International Space Station Live — ORBITAL" },
      {
        property: "og:description",
        content: "Live ISS position, current crew and calculated passes over your location.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IssPage,
});

function IssPage() {
  const data = useSatelliteGroups(["stations"]);
  const observerCtl = useObserver();
  const { observer } = observerCtl;
  const now = useNow(30_000);
  const crew = useIssCrew();

  const iss = useMemo(
    () => data.satellites.find((s) => s.noradId === ISS_NORAD_ID),
    [data.satellites],
  );
  const issList = useMemo(() => (iss ? [iss] : []), [iss]);
  const states = useLiveStates(issList, 1000);
  const state = states[0];

  const trail = useMemo(() => (iss && now ? groundTrack(iss, now) : []), [iss, now]);

  const { passes, computing } = usePassPredictions(issList, observer, {
    hours: 96,
    minElevationDeg: 10,
  });
  const nextPasses = passes.slice(0, 4);

  const description =
    iss?.description ??
    "The largest human-made object in low Earth orbit, continuously crewed since November 2000.";

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Station tracking"
        title="International Space Station"
        description={description}
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

      {!iss && data.status === "error" ? (
        <div className="mt-10">
          <DataErrorPanel error={data.error} onRetry={data.refetch} />
        </div>
      ) : !iss ? (
        <div className="mt-10">
          <LoadingPanel label="Retrieving the station's element set…" />
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="panel rounded-3xl p-6">
            <Globe3D
              className="aspect-square w-full"
              states={states}
              selectedId={iss.id}
              trail={trail}
              observer={observer}
              now={now}
            />
            <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-5">
              <Stat
                label="Latitude"
                value={state ? `${state.position.latitude.toFixed(3)}°` : "—"}
              />
              <Stat
                label="Longitude"
                value={state ? `${state.position.longitude.toFixed(3)}°` : "—"}
              />
              <Stat
                label="Altitude"
                value={state ? `${state.position.altitudeKm.toFixed(1)} km` : "—"}
              />
              <Stat
                label="Velocity"
                value={state ? `${state.position.velocityKmS.toFixed(3)} km/s` : "—"}
              />
            </div>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              Element set epoch {new Date(iss.epoch).toLocaleString()} · sunlit:{" "}
              {state ? (state.sunlit ? "yes" : "no (in Earth's shadow)") : "—"}
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mono-label flex items-center gap-2">
                <Orbit className="h-3 w-3" /> Station vitals
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Inclination" value={`${(inclinationDeg(iss) ?? 0).toFixed(2)}°`} />
                <Stat label="Period" value={`${(orbitalPeriodMin(iss) ?? 0).toFixed(1)} min`} />
                <Stat label="Apogee" value={`${Math.round(apsides(iss)?.apogeeKm ?? 0)} km`} />
                {ISS_FACTS.slice(0, 3).map((f) => (
                  <Stat key={f.label} label={f.label} value={f.value} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mono-label flex items-center gap-2">
                <Users className="h-3 w-3" /> Crew aboard
                {crew.crew.length > 0 ? ` · ${crew.crew.length}` : ""}
              </h2>
              {crew.isLoading ? (
                <div className="mt-4">
                  <LoadingPanel label="Fetching the current crew manifest…" />
                </div>
              ) : crew.crew.length === 0 ? (
                <div className="panel mt-4 rounded-2xl p-6 text-center text-sm text-muted-foreground">
                  {crew.error ?? "Crew manifest is currently unavailable."}
                </div>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {crew.crew.map((c) => (
                    <li key={c.name} className="panel flex items-center gap-4 rounded-2xl p-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/12 font-display text-sm font-bold text-primary">
                        {c.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-semibold text-foreground">
                          {c.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[c.role, c.agency].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {c.craft}
                          {c.daysAboard ? ` · ${c.daysAboard} days in space` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {crew.source && (
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  via {crew.source.providerLabel}
                </p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="mono-label">Next passes · {observer.name}</h2>
                <Link to="/passes" className="text-xs text-primary hover:underline">
                  All passes
                </Link>
              </div>
              <ObserverPicker className="mt-3" {...observerCtl} />
              <ul className="mt-4 grid gap-3">
                {nextPasses.map((p) => (
                  <li
                    key={p.id}
                    className="panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
                  >
                    <div>
                      <p className="font-display text-sm font-semibold text-foreground">
                        {formatDay(p.startTime)} · {formatTime(p.startTime)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground capitalize">
                        {p.visibility} · rises {compass(p.startAzimuthDeg)}, sets{" "}
                        {compass(p.endAzimuthDeg)}
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs text-foreground">
                      <p>{p.maxElevationDeg}° max</p>
                      <p className="text-muted-foreground">
                        {Math.floor(p.durationSec / 60)}m {p.durationSec % 60}s
                      </p>
                    </div>
                  </li>
                ))}
                {computing && nextPasses.length === 0 && (
                  <li>
                    <LoadingPanel label="Calculating passes for your location…" />
                  </li>
                )}
                {!computing && nextPasses.length === 0 && (
                  <li className="panel rounded-2xl p-6 text-center text-sm text-muted-foreground">
                    No ISS passes above 10° over {observer.name} in the next four days.
                  </li>
                )}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
