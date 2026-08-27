import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { SatelliteState, Satellite } from "@/services/satellite/satelliteTypes";
import type { TrailPoint } from "@/services/satellite/satellitePropagation";

interface GlobeProps {
  /** Live SGP4-propagated states. */
  states: SatelliteState[];
  selectedId?: string | null | undefined;
  onSelect?: (sat: Satellite) => void;
  size?: number;
  className?: string;
  /** show orbit rings */
  detailed?: boolean;
  /** predicted ground track of the selected object */
  trail?: TrailPoint[];
}

function project(lat: number, lon: number, altKm: number, spin: number, r: number) {
  const la = (lat * Math.PI) / 180;
  const lo = ((lon + spin) * Math.PI) / 180;
  const x = Math.cos(la) * Math.sin(lo);
  const y = Math.sin(la);
  const z = Math.cos(la) * Math.cos(lo);
  const lift = 1 + Math.min(altKm / 6371, 0.55);
  return { cx: r + x * r * 0.82 * lift, cy: r - y * r * 0.82 * lift, z };
}

/**
 * Interactive Earth. Pure CSS/SVG orthographic projection — no WebGL — fed
 * with live geodetic positions propagated locally from real element sets.
 */
export function Globe({
  states,
  selectedId,
  onSelect,
  size = 420,
  className,
  detailed = true,
  trail,
}: GlobeProps) {
  const [spin, setSpin] = useState(0);
  const r = size / 2;

  const points = useMemo(
    () =>
      states.map((s) => {
        const p = project(
          s.position.latitude,
          s.position.longitude,
          s.position.altitudeKm,
          spin,
          r,
        );
        return { state: s, ...p, front: p.z > -0.05 };
      }),
    [states, spin, r],
  );

  const trailSegments = useMemo(() => {
    if (!trail || trail.length < 2) return [] as string[];
    const segs: string[] = [];
    let cur: string[] = [];
    for (const pt of trail) {
      const p = project(pt.latitude, pt.longitude, pt.altitudeKm, spin, r);
      if (p.z < -0.05) {
        if (cur.length > 1) segs.push(cur.join(" "));
        cur = [];
        continue;
      }
      cur.push(`${cur.length === 0 ? "M" : "L"}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`);
    }
    if (cur.length > 1) segs.push(cur.join(" "));
    return segs;
  }, [trail, spin, r]);

  return (
    <div className={cn("relative select-none", className)} style={{ width: size, height: size }}>
      {/* atmospheric halo */}
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--primary) 42%, transparent), transparent 68%)",
        }}
      />

      {/* the sphere */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full border border-border/70"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, color-mix(in oklab, var(--aurora) 55%, transparent), transparent 55%)," +
            "radial-gradient(circle at 70% 78%, color-mix(in oklab, var(--plasma) 35%, transparent), transparent 60%)," +
            "linear-gradient(160deg, color-mix(in oklab, var(--surface-raised) 95%, transparent), var(--background))",
          boxShadow:
            "inset -28px -24px 70px oklch(0 0 0 / 0.75), inset 20px 18px 60px color-mix(in oklab, var(--primary) 18%, transparent)",
        }}
      >
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              "radial-gradient(22px 13px at 20% 34%, color-mix(in oklab, var(--signal) 60%, transparent), transparent)," +
              "radial-gradient(38px 20px at 44% 52%, color-mix(in oklab, var(--signal) 45%, transparent), transparent)," +
              "radial-gradient(26px 30px at 63% 30%, color-mix(in oklab, var(--signal) 40%, transparent), transparent)," +
              "radial-gradient(30px 16px at 78% 66%, color-mix(in oklab, var(--ember) 35%, transparent), transparent)," +
              "radial-gradient(18px 24px at 88% 42%, color-mix(in oklab, var(--signal) 42%, transparent), transparent)",
            backgroundSize: "800px 100%",
            backgroundRepeat: "repeat-x",
            animation: "globe-drift 60s linear infinite",
          }}
        />
        {/* graticule */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-30">
          {[15, 30, 45, 60, 75].map((p) => (
            <line key={p} x1="0" y1={p + 5} x2="100" y2={p + 5} stroke="currentColor" strokeWidth="0.2" />
          ))}
          {[10, 25, 40, 55, 70, 85].map((p) => (
            <ellipse
              key={p}
              cx="50"
              cy="50"
              rx={Math.abs(50 - p) * 0.9 + 4}
              ry="49"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.2"
            />
          ))}
        </svg>
        {/* terminator */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, transparent 38%, oklch(0 0 0 / 0.55) 62%, oklch(0 0 0 / 0.82) 100%)",
          }}
        />
      </div>

      {/* orbit rings */}
      {detailed && (
        <>
          <div
            className="animate-sweep absolute inset-[-8%] rounded-full border border-primary/25"
            style={{ transform: "rotateX(72deg)", animationDuration: "22s" }}
          />
          <div
            className="animate-sweep absolute inset-[-16%] rounded-full border border-plasma/20"
            style={{ transform: "rotateX(66deg) rotateZ(38deg)", animationDuration: "34s" }}
          />
        </>
      )}

      {/* satellites + predicted track */}
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full">
        {trailSegments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="var(--primary)"
            strokeOpacity={0.55}
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
        ))}
        {points.map((p) => {
          const sat = p.state.satellite;
          const active = sat.id === selectedId;
          const color =
            sat.category === "space-station"
              ? "var(--ember)"
              : sat.category === "starlink"
                ? "var(--primary)"
                : sat.category === "navigation"
                  ? "var(--plasma)"
                  : "var(--signal)";
          return (
            <g
              key={sat.id}
              opacity={p.front ? (p.state.sunlit ? 1 : 0.6) : 0.22}
              className="cursor-pointer"
              onClick={() => onSelect?.(sat)}
            >
              {active && <circle cx={p.cx} cy={p.cy} r={11} fill={color} opacity={0.22} />}
              <circle
                cx={p.cx}
                cy={p.cy}
                r={active ? 5 : sat.category === "space-station" ? 4.5 : 3}
                fill={color}
                stroke="var(--background)"
                strokeWidth={1}
              />
              {active && (
                <text
                  x={p.cx + 10}
                  y={p.cy - 8}
                  fontSize={11}
                  fill="var(--foreground)"
                  className="font-mono"
                >
                  {sat.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* rotation control */}
      <div className="absolute -bottom-14 left-1/2 flex w-full max-w-xs -translate-x-1/2 items-center gap-3">
        <span className="mono-label">Rotate</span>
        <input
          type="range"
          min={-180}
          max={180}
          value={spin}
          aria-label="Rotate globe"
          onChange={(e) => setSpin(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
        />
        <span className="font-mono text-xs text-muted-foreground">{spin}°</span>
      </div>
    </div>
  );
}
