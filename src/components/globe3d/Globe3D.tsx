/**
 * Globe3D — the WebGL globe plus its holographic overlay UI.
 *
 * The canvas is client-only (WebGL has no meaning during SSR) and degrades to
 * an honest message if the browser cannot give us a context.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ClientOnly } from "@tanstack/react-router";
import { Crosshair, Eye, Globe2, Loader2, Orbit, X } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  apsides,
  inclinationDeg,
  orbitalPeriodMin,
  type TrailPoint,
} from "@/services/satellite/satellitePropagation";
import type {
  ObserverLocation,
  Satellite,
  SatelliteState,
} from "@/services/satellite/satelliteTypes";
import { CATEGORY_LABELS } from "@/services/satellite/satelliteCatalog";
import { Scene, type AnchorInfo, type ViewMode } from "./Scene";
import { colorFor } from "./geo";

export interface Globe3DProps {
  states: SatelliteState[];
  selectedId?: string | null;
  onSelect?: (sat: Satellite | null) => void;
  trail?: TrailPoint[];
  observer?: ObserverLocation | null;
  now: Date | null;
  className?: string;
  /** Extra content rendered inside the detail panel (e.g. next pass). */
  panelExtra?: (state: SatelliteState) => ReactNode;
  /** Fewer stars / lower tessellation for small hero canvases. */
  quality?: "high" | "low";
  /**
   * Fraction of the canvas' shorter side the planet should span at rest.
   * The camera distance and framing are derived from it, so the globe grows
   * with the viewport instead of being cropped.
   */
  fill?: number;
}

const MODES: { id: ViewMode; label: string; icon: typeof Orbit }[] = [
  { id: "orbit", label: "Orbit", icon: Orbit },
  { id: "satellite", label: "Satellite", icon: Crosshair },
  { id: "ground", label: "Ground", icon: Eye },
];

/** Smoothly eases a displayed number towards the latest real value. */
function useAnimatedNumber(value: number, digits = 1) {
  const [shown, setShown] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const d = value - ref.current;
      if (Math.abs(d) < Math.pow(10, -digits) / 2) {
        ref.current = value;
        setShown(value);
        return;
      }
      ref.current += d * 0.18;
      setShown(ref.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, digits]);
  return shown.toFixed(digits);
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="mono-label text-[10px] opacity-70">{label}</div>
      <div className="font-mono text-sm text-foreground">
        {value}
        {unit ? <span className="ml-0.5 text-[10px] text-muted-foreground">{unit}</span> : null}
      </div>
    </div>
  );
}

function DetailBody({
  state,
  extra,
}: {
  state: SatelliteState;
  extra?: (s: SatelliteState) => ReactNode;
}) {
  const sat = state.satellite;
  const alt = useAnimatedNumber(state.position.altitudeKm, 1);
  const vel = useAnimatedNumber(state.position.velocityKmS, 3);
  const lat = useAnimatedNumber(state.position.latitude, 3);
  const lon = useAnimatedNumber(state.position.longitude, 3);
  const period = orbitalPeriodMin(sat);
  const incl = inclinationDeg(sat);
  const aps = apsides(sat);
  const color = colorFor(sat.category);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 pr-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            <h3 className="font-display text-base leading-tight text-foreground">{sat.name}</h3>
          </div>
          <p className="mono-label mt-1 text-[10px]">
            NORAD {sat.noradId} · {CATEGORY_LABELS[sat.category] ?? sat.category}
            {sat.cosparId ? ` · COSPAR ${sat.cosparId}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "mt-4 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px]",
            state.sunlit
              ? "border-amber-400/40 text-amber-300"
              : "border-border text-muted-foreground",
          )}
        >
          {state.sunlit ? "SUNLIT" : "ECLIPSE"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Metric label="Altitude" value={alt} unit="km" />
        <Metric label="Velocity" value={vel} unit="km/s" />
        <Metric label="Latitude" value={lat} unit="°" />
        <Metric label="Longitude" value={lon} unit="°" />
        {period ? <Metric label="Period" value={period.toFixed(1)} unit="min" /> : null}
        {incl !== null ? <Metric label="Inclination" value={incl.toFixed(2)} unit="°" /> : null}
        {aps ? <Metric label="Apogee" value={aps.apogeeKm.toFixed(0)} unit="km" /> : null}
        {aps ? <Metric label="Perigee" value={aps.perigeeKm.toFixed(0)} unit="km" /> : null}
      </div>

      <div className="border-t border-border/60 pt-2">
        <p className="text-xs text-muted-foreground">
          {sat.operator} · {sat.country}
        </p>
        <p className="mono-label mt-1 text-[10px] opacity-70">
          Element set epoch {new Date(sat.epoch).toISOString().slice(0, 16).replace("T", " ")}Z
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          3D model is a representative archetype, not a scan of the actual spacecraft. Position,
          velocity and trajectory are real SGP4 results.
        </p>
      </div>

      {extra?.(state)}
    </div>
  );
}

function Fallback({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </div>
    </div>
  );
}

export function Globe3D({
  states,
  selectedId = null,
  onSelect,
  trail,
  observer,
  now,
  className,
  panelExtra,
  quality = "high",
  fill = 0.66,
}: Globe3DProps) {
  const [mode, setMode] = useState<ViewMode>("orbit");
  const [hover, setHover] = useState<{ id: string; name: string; x: number; y: number } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const isMobile = useIsMobile();
  const [narrow, setNarrow] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  /** Small canvases get the docked sheet instead of a floating panel. */
  const compact = isMobile || narrow;

  const hostRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  const sceneNow = useMemo(() => now ?? new Date(), [now]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;
    const read = () => {
      setNarrow(host.clientWidth < 520);
      setSize({ w: host.clientWidth, h: host.clientHeight });
    };
    const ro = new ResizeObserver(read);
    ro.observe(host);
    read();
    return () => ro.disconnect();
  }, []);

  /**
   * Coordinated framing: pick the camera distance that makes the Earth (radius
   * 1 scene unit, plus its atmospheric shell) cover `fill` of the canvas'
   * shorter side, whatever the aspect ratio. Portrait phones, landscape
   * phones, tablets and wide desktops therefore all get the same visual
   * weight rather than a cropped zoom.
   */
  const FOV = 42;
  const baseDistance = useMemo(() => {
    const w = size.w || 1;
    const h = size.h || 1;
    const vFov = (FOV * Math.PI) / 180;
    const aspect = w / h;
    // effective half-angle across the shorter screen axis
    const half = aspect >= 1 ? vFov / 2 : Math.atan(Math.tan(vFov / 2) * aspect);
    const target = Math.min(0.96, Math.max(0.3, fill));
    return Math.min(6, Math.max(1.35, 1.06 / (target * Math.tan(half))));
  }, [size.w, size.h, fill]);

  const selected = useMemo(
    () => states.find((s) => s.satellite.id === selectedId) ?? null,
    [states, selectedId],
  );

  useEffect(() => {
    if (!selectedId && mode !== "orbit") setMode("orbit");
  }, [selectedId, mode]);

  const handleAnchor = useCallback(
    (a: AnchorInfo) => {
      const dot = dotRef.current;
      if (dot) {
        dot.style.left = `${a.x}%`;
        dot.style.top = `${a.y}%`;
        dot.style.opacity = a.visible ? "1" : "0";
      }
      if (compact) return;
      const panel = panelRef.current;
      const line = lineRef.current;
      const host = hostRef.current;
      if (!panel || !line || !host) return;
      const W = host.clientWidth;
      const H = host.clientHeight;
      const pw = panel.offsetWidth || 300;
      const ph = panel.offsetHeight || 260;
      const ax = (a.x / 100) * W;
      const ay = (a.y / 100) * H;
      const left = Math.min(
        Math.max(8, ax > W * 0.55 ? ax - pw - 28 : ax + 28),
        Math.max(8, W - pw - 8),
      );
      const top = Math.min(Math.max(44, ay - ph / 2), Math.max(44, H - ph - 12));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.opacity = a.visible ? "1" : "0.35";
      const attachX = left + (ax > left + pw / 2 ? pw : 0);
      line.setAttribute("x1", String(a.x));
      line.setAttribute("y1", String(a.y));
      line.setAttribute("x2", String((attachX / W) * 100));
      line.setAttribute("y2", String(((top + 24) / H) * 100));
    },
    [compact],
  );

  const select = useCallback(
    (id: string | null) => {
      // Clearing the hover tooltip here keeps overlay state from outliving the
      // selection it belonged to.
      setHover(null);
      if (!id) {
        const dot = dotRef.current;
        if (dot) dot.style.opacity = "0";
        setMode("orbit");
        onSelect?.(null);
        return;
      }
      const sat = states.find((s) => s.satellite.id === id)?.satellite ?? null;
      onSelect?.(sat);
    },
    [onSelect, states],
  );

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-black",
        className,
      )}
    >
      <ClientOnly fallback={<Fallback message="Preparing globe…" />}>
        {failed ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This browser could not open a WebGL context, so the 3D globe is unavailable. All
              tracking data on this page is unaffected.
            </p>
          </div>
        ) : (
          <Suspense fallback={<Fallback message="Loading surface imagery…" />}>
            <Canvas
              camera={{
                position: [0, baseDistance * 0.34, baseDistance * 0.94],
                fov: FOV,
                near: 0.01,
                far: 200,
              }}
              dpr={[1, quality === "high" ? 2 : 1.5]}
              gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener("webglcontextlost", () => setFailed(true));
              }}
              onPointerMissed={() => select(null)}
            >
              <Scene
                states={states}
                selectedId={selectedId}
                onSelect={select}
                onHover={setHover}
                trail={trail}
                observer={observer}
                mode={mode}
                now={sceneNow}
                onAnchor={handleAnchor}
                quality={quality}
                baseDistance={baseDistance}
              />
            </Canvas>
          </Suspense>
        )}
      </ClientOnly>

      {/* hover tooltip */}
      {hover && !compact && (
        <div
          className="pointer-events-none absolute z-10 -translate-y-8 translate-x-3 rounded-md border border-border/70 bg-background/85 px-2 py-1 font-mono text-[11px] text-foreground backdrop-blur"
          style={{ left: `${hover.x * 100}%`, top: `${hover.y * 100}%` }}
        >
          {hover.name}
        </div>
      )}

      {/* connection line + anchor dot */}
      {selected && (
        <>
          <svg
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              ref={lineRef}
              stroke={colorFor(selected.satellite.category)}
              strokeOpacity={0.6}
              strokeWidth={0.15}
              strokeDasharray="1 1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div
            ref={dotRef}
            className="pointer-events-none absolute z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity"
            style={{ background: colorFor(selected.satellite.category) }}
          />
        </>
      )}

      {/* view modes */}
      <div className="absolute left-3 top-3 z-20 flex gap-1 rounded-full border border-border/70 bg-background/70 p-1 backdrop-blur">
        {MODES.map((m) => {
          const disabled = (m.id === "satellite" && !selected) || (m.id === "ground" && !observer);
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => setMode(m.id)}
              title={
                disabled
                  ? m.id === "ground"
                    ? "Set your location to use ground view"
                    : "Select a satellite first"
                  : `${m.label} view`
              }
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                mode === m.id
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground",
                disabled && "cursor-not-allowed opacity-35",
              )}
            >
              <m.icon className="h-3 w-3" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Globe2 className="h-3 w-3" />
        {states.length} objects · SGP4 live
      </div>

      {/* holographic detail panel (desktop) / bottom sheet (mobile) */}
      {selected && !compact && (
        <div
          ref={panelRef}
          className="absolute z-20 w-[min(300px,calc(100%-1rem))] rounded-xl border border-primary/30 bg-background/80 p-3 shadow-[0_0_40px_-12px_var(--primary)] backdrop-blur-md transition-opacity"
          style={{ left: "60%", top: "20%" }}
        >
          <button
            type="button"
            onClick={() => select(null)}
            aria-label="Close satellite details"
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <DetailBody state={selected} {...(panelExtra ? { extra: panelExtra } : {})} />
        </div>
      )}

      {selected && compact && (
        <div className="fixed inset-x-0 bottom-0 z-[60] max-h-[70dvh] overflow-y-auto rounded-t-2xl border-t border-primary/30 bg-background/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] backdrop-blur-md duration-300 animate-in slide-in-from-bottom">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
          <button
            type="button"
            onClick={() => select(null)}
            aria-label="Close satellite details"
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-background/80 text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <DetailBody state={selected} {...(panelExtra ? { extra: panelExtra } : {})} />
          <button
            type="button"
            onClick={() => select(null)}
            className="mt-4 w-full rounded-full border border-border/70 py-2.5 text-sm font-medium text-muted-foreground"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
