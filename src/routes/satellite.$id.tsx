import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Crosshair, Loader2, Star } from "lucide-react";

import { Globe3D } from "@/components/globe3d/Globe3D";
import { BodyClassBadge, Fact, FactGrid, Note } from "@/components/solar/BodyUI";
import { ObserverPicker } from "@/components/ObserverPicker";
import { CATEGORY_LABELS } from "@/services/satellite/satelliteCatalog";
import {
  apsides,
  compass,
  formatDay,
  formatTime,
  groundTrack,
  inclinationDeg,
  lookAnglesAt,
  orbitalPeriodMin,
} from "@/services/satellite/satellitePropagation";
import { useSatelliteLoader } from "@/services/satellite/useCatalog";
import { usePassPredictions } from "@/services/satellite/usePassPredictions";
import {
  useFavorites,
  useLiveStates,
  useNow,
  useObserver,
} from "@/services/satellite/useOrbitalData";
import type { Satellite } from "@/services/satellite/satelliteTypes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/satellite/$id")({
  head: ({ params }) => {
    const title = `Satellite ${params.id} — live dossier — ORBITAL`;
    const description = `Live SGP4 dossier for NORAD ${params.id}: real-time latitude, longitude, altitude, velocity, orbital elements and the next calculated pass over your location.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SatelliteDossier,
});

function SatelliteDossier() {
  const { id } = Route.useParams();
  const noradId = Number(id.replace(/\D/g, ""));
  const { load, loadingId, error } = useSatelliteLoader();
  const [sat, setSat] = useState<Satellite | null>(null);
  const [trackLive, setTrackLive] = useState(true);

  const observerCtl = useObserver();
  const { observer } = observerCtl;
  const now = useNow(1000);
  const { isFavorite, toggle } = useFavorites();

  useEffect(() => {
    let cancelled = false;
    setSat(null);
    if (!Number.isFinite(noradId) || noradId <= 0) return;
    void load(noradId).then((s) => {
      if (!cancelled) setSat(s);
    });
    return () => {
      cancelled = true;
    };
  }, [noradId, load]);

  const list = useMemo(() => (sat ? [sat] : []), [sat]);
  const states = useLiveStates(list, 1000);
  const state = states[0] ?? null;

  const trail = useMemo(
    () => (sat && now ? groundTrack(sat, now) : []),
    // recompute roughly once a minute rather than every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sat, now ? Math.floor(now.getTime() / 60000) : 0],
  );

  const look = useMemo(
    () => (sat && now ? lookAnglesAt(sat, observer, now) : null),
    [sat, observer, now],
  );

  const { passes, computing } = usePassPredictions(list, observer, {
    hours: 48,
    minElevationDeg: 10,
    enabled: list.length > 0,
  });
  const nextPass = passes[0];

  if (!Number.isFinite(noradId) || noradId <= 0) {
    return (
      <Missing message="That identifier is not a NORAD catalog number." />
    );
  }

  if (!sat) {
    return loadingId === noradId ? (
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-32 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Retrieving element set for NORAD {noradId}…
      </div>
    ) : (
      <Missing
        message={
          error ??
          `No published element set could be retrieved for NORAD ${noradId}. The object may not be in the groups ORBITAL indexes, or the provider is unavailable.`
        }
      />
    );
  }

  const period = orbitalPeriodMin(sat);
  const incl = inclinationDeg(sat);
  const aps = apsides(sat);
  const fav = isFavorite(sat.noradId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Link
        to="/tracker"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to tracker
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <BodyClassBadge kind="artificial" />
        <span className="mono-label">
          NORAD {sat.noradId}
          {sat.cosparId ? ` · COSPAR ${sat.cosparId}` : ""}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{sat.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {CATEGORY_LABELS[sat.category] ?? sat.category} · {sat.operator} · {sat.country}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTrackLive((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors",
              trackLive
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Crosshair className="h-3.5 w-3.5" />
            {trackLive ? "Tracking live" : "Free camera"}
          </button>
          <button
            onClick={() => toggle(sat.noradId)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors",
              fav
                ? "border-signal bg-signal/15 text-signal"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className={cn("h-3.5 w-3.5", fav && "fill-current")} />
            {fav ? "In favourites" : "Add to favourites"}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Globe3D
          className="aspect-square w-full sm:aspect-[4/3] lg:aspect-auto lg:h-[540px]"
          states={states}
          selectedId={trackLive ? sat.id : null}
          onSelect={(s) => setTrackLive(Boolean(s))}
          trail={trail}
          observer={observer}
          now={now}
          fill={0.7}
        />

        <div className="space-y-3">
          <div className="panel rounded-2xl p-5">
            <p className="mono-label">Live state · SGP4, updated every second</p>
            {state ? (
              <dl className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm">
                <Live label="Latitude" value={`${state.position.latitude.toFixed(3)}°`} />
                <Live label="Longitude" value={`${state.position.longitude.toFixed(3)}°`} />
                <Live label="Altitude" value={`${state.position.altitudeKm.toFixed(1)} km`} />
                <Live label="Velocity" value={`${state.position.velocityKmS.toFixed(3)} km/s`} />
                <Live label="Illumination" value={state.sunlit ? "Sunlit" : "Eclipse"} />
                <Live
                  label="Propagated at"
                  value={`${new Date(state.position.timestamp).toISOString().slice(11, 19)}Z`}
                />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Propagating…</p>
            )}
          </div>

          <div className="panel rounded-2xl p-5">
            <p className="mono-label">From your location</p>
            <ObserverPicker className="mt-3" {...observerCtl} />
            {look ? (
              <dl className="mt-4 grid grid-cols-3 gap-3 font-mono text-sm">
                <Live label="Elevation" value={`${look.elevationDeg.toFixed(1)}°`} />
                <Live
                  label="Azimuth"
                  value={`${look.azimuthDeg.toFixed(1)}° ${compass(look.azimuthDeg)}`}
                />
                <Live label="Slant range" value={`${Math.round(look.rangeKm).toLocaleString()} km`} />
              </dl>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              {look && look.elevationDeg > 0
                ? "Currently above your horizon."
                : "Currently below your horizon."}
            </p>
          </div>

          <div className="panel rounded-2xl p-5">
            <p className="mono-label">Next calculated pass (≥10° elevation, 48 h)</p>
            {nextPass ? (
              <div className="mt-3 text-sm">
                <p className="font-display text-lg text-foreground">
                  {formatDay(nextPass.startTime)} · {formatTime(nextPass.startTime)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Peak {nextPass.maxElevationDeg.toFixed(0)}° · {Math.round(nextPass.durationSec / 60)} min ·{" "}
                  {nextPass.visibility}
                </p>
              </div>
            ) : computing ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching the next 48 hours…
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No pass above 10° from this location in the next 48 hours.
              </p>
            )}
          </div>
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl font-bold text-foreground">Orbit</h2>
      <div className="mt-4">
        <FactGrid>
          <Fact label="Period" value={period ? `${period.toFixed(2)} min` : undefined} />
          <Fact label="Inclination" value={incl !== null ? `${incl.toFixed(2)}°` : undefined} />
          <Fact label="Apogee" value={aps ? `${aps.apogeeKm.toFixed(0)} km` : undefined} />
          <Fact label="Perigee" value={aps ? `${aps.perigeeKm.toFixed(0)} km` : undefined} />
          <Fact
            label="Element-set epoch"
            value={`${new Date(sat.epoch).toISOString().slice(0, 16).replace("T", " ")}Z`}
          />
          <Fact label="Launch date" value={sat.launchDate} />
          <Fact label="Constellation" value={sat.constellation} />
          <Fact label="Source group" value={sat.group} />
        </FactGrid>
      </div>

      <Note>
        Every dynamic value on this page is computed in your browser with SGP4 from the published
        element set above — nothing is interpolated from a stored track. Fields marked “Data
        unavailable” are simply not present in the published record. The 3D model is a
        representative archetype for the object class, not a scan of this spacecraft.
      </Note>
    </div>
  );
}

function Live({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mono-label text-[10px]">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}

function Missing({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Object unavailable</h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <Link
        to="/tracker"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tracker
      </Link>
    </div>
  );
}
