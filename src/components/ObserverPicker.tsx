import { LocateFixed, MapPin, Pencil } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { OBSERVER_PRESETS, type ObserverResult } from "@/services/satellite/useOrbitalData";

/** Real browser geolocation, city presets and a manual coordinate fallback. */
export function ObserverPicker({
  observer,
  geoState,
  geoError,
  requestGeolocation,
  setObserver,
  className,
}: ObserverResult & { className?: string }) {
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState(String(observer.latitude));
  const [lon, setLon] = useState(String(observer.longitude));
  const [alt, setAlt] = useState(String(observer.altitudeM));
  const [invalid, setInvalid] = useState<string | null>(null);

  const apply = () => {
    const la = Number(lat);
    const lo = Number(lon);
    const al = Number(alt);
    if (!Number.isFinite(la) || la < -90 || la > 90) {
      setInvalid("Latitude must be between −90 and 90.");
      return;
    }
    if (!Number.isFinite(lo) || lo < -180 || lo > 180) {
      setInvalid("Longitude must be between −180 and 180.");
      return;
    }
    setInvalid(null);
    setObserver({
      name: "Manual coordinates",
      latitude: Number(la.toFixed(4)),
      longitude: Number(lo.toFixed(4)),
      altitudeM: Number.isFinite(al) ? Math.round(al) : 0,
      source: "manual",
    });
    setManual(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono-label flex items-center gap-1.5">
          <MapPin className="h-3 w-3" /> Observer
        </span>
        <button
          onClick={requestGeolocation}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
            observer.source === "geolocation"
              ? "border-signal bg-signal/15 text-signal"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <LocateFixed className={cn("h-3 w-3", geoState === "prompting" && "animate-pulse")} />
          {geoState === "prompting" ? "Locating…" : "Use my location"}
        </button>
        <button
          onClick={() => setManual((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
            observer.source === "manual" || manual
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <Pencil className="h-3 w-3" /> Enter coordinates
        </button>
        {OBSERVER_PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => setObserver(p)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              observer.name === p.name
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {manual && (
        <div className="panel flex flex-wrap items-end gap-3 rounded-2xl p-4">
          <Field label="Latitude °" value={lat} onChange={setLat} />
          <Field label="Longitude °" value={lon} onChange={setLon} />
          <Field label="Altitude m" value={alt} onChange={setAlt} />
          <button
            onClick={apply}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Set location
          </button>
          {invalid && <p className="w-full text-[11px] text-ember">{invalid}</p>}
        </div>
      )}

      <p className="font-mono text-[11px] text-muted-foreground">
        {observer.name} · {observer.latitude.toFixed(4)}°, {observer.longitude.toFixed(4)}° ·{" "}
        {observer.altitudeM} m
        {observer.source === "geolocation" ? " · from your device" : ""}
      </p>
      <p className="text-[11px] text-muted-foreground/70">
        Location is optional. It stays in this browser — coordinates are used locally for SGP4 look
        angles and are never sent to a server. Prefer not to share? Pick a city or type coordinates.
      </p>
      {geoError && <p className="text-[11px] text-ember">{geoError}</p>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="mono-label text-[10px]">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}
