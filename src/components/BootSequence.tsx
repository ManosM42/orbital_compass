/**
 * Cinematic boot sequence — guaranteed full-duration title sequence.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { propagateState } from "@/services/satellite/satellitePropagation";
import { satelliteCatalogService } from "@/services/satellite/SatelliteCatalogService";
import { satelliteSearchService } from "@/services/satellite/SatelliteSearchService";
import { useCatalog } from "@/services/satellite/useCatalog";

export const REPLAY_EVENT = "orbital:replay-intro";

export function ReplayIntroButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
        }
      }}
      className={className}
    >
      Replay Intro
    </button>
  );
}

/** Phase boundaries in ms (full-motion variant). Total duration ~7.4s */
const T = {
  stars: 0,
  horizon: 700,
  limb: 1500,
  arcs: 2900,
  lines: 4200,
  wordmark: 5300,
  dissolve: 6600,
  end: 7400,
} as const;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface Status {
  text: string;
  tone: "info" | "warn";
}

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [t, setT] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [status, setStatus] = useState<Status>({ text: "Linking to element-set provider", tone: "info" });
  const [compact, setCompact] = useState(false);
  const catalog = useCatalog();
  const started = useRef(false);

  const dismiss = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => {
      onComplete();
    }, 900);
  }, [leaving, onComplete]);

  /* Timeline clock (ensures smooth animation progression for the full duration) */
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    setCompact(prefersReducedMotion() || window.innerWidth < 640);
    
    const tick = (now: number) => {
      const elapsed = now - t0;
      setT(elapsed);

      if (elapsed >= T.end) {
        dismiss();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dismiss]);

  /* Real initialisation running in parallel behind the animation --- */
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    const say = (text: string, tone: Status["tone"] = "info") =>
      !cancelled && setStatus({ text, tone });

    void (async () => {
      const snap = await Promise.race([
        satelliteCatalogService.load(),
        new Promise<null>((r) => window.setTimeout(() => r(null), 8000)),
      ]);
      if (cancelled) return;

      if (!snap || snap.state !== "ready") {
        say(snap?.error ?? "Provider slow to respond — running on fallback", "warn");
        return;
      }
      if (snap.fromLocalCache) say("Running on cached catalogue", "warn");
      else say(`${snap.entries.length.toLocaleString()} element sets retrieved`);

      await new Promise((r) => window.setTimeout(r, 200));
      if (cancelled) return;
      if (satelliteSearchService.size > 0) say(`Catalogue indexed — ${satelliteSearchService.size.toLocaleString()} objects searchable`);

      const first = snap.entries[0];
      const probe = first ? await satelliteCatalogService.getSatellite(first.noradId) : null;
      if (cancelled) return;
      const propagated = probe ? propagateState(probe, new Date()) : null;
      if (propagated) say("SGP4 propagator verified successfully");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const phase = useMemo(() => {
    const scale = compact ? 0.55 : 1;
    const at = (ms: number) => t >= ms * scale;
    return {
      stars: at(T.stars),
      horizon: at(T.horizon),
      limb: at(T.limb),
      arcs: at(T.arcs),
      lines: at(T.lines),
      wordmark: at(T.wordmark),
      dissolve: at(T.dissolve),
    };
  }, [t, compact]);

  const objectCount = catalog.entries.length;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="ORBITAL initialising"
      className={cn(
        "fixed inset-0 z-[99999] overflow-hidden bg-background transition-opacity duration-[900ms] ease-out",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {/* 1 — starfield emerges from black */}
      <div
        className={cn(
          "starfield pointer-events-none absolute inset-0 transition-opacity duration-[1600ms]",
          phase.stars ? "opacity-80" : "opacity-0",
        )}
      />

      {/* 2 — horizon glow, then 3 — the Earth limb rising */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 transition-opacity duration-[1400ms]",
          phase.horizon ? "opacity-100" : "opacity-0",
        )}
        style={{
          background:
            "radial-gradient(120% 90% at 50% 118%, color-mix(in oklch, var(--primary) 45%, transparent) 0%, color-mix(in oklch, var(--primary) 12%, transparent) 38%, transparent 68%)",
        }}
      />
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 aspect-square w-[190vw] -translate-x-1/2 rounded-full transition-all duration-[2600ms] ease-out sm:w-[150vw]",
          phase.limb ? "bottom-[-152vw] opacity-100 sm:bottom-[-120vw]" : "bottom-[-176vw] opacity-0 sm:bottom-[-142vw]",
        )}
        style={{
          background:
            "radial-gradient(circle at 50% 8%, color-mix(in oklch, var(--primary) 30%, var(--background)) 0%, var(--background) 42%)",
          boxShadow:
            "0 0 120px 24px color-mix(in oklch, var(--primary) 35%, transparent), inset 0 6px 40px color-mix(in oklch, var(--aurora, var(--primary)) 35%, transparent)",
        }}
      />

      {/* 4 — orbital arcs sweeping over the limb */}
      <svg
        aria-hidden
        viewBox="0 0 1000 620"
        preserveAspectRatio="xMidYMax slice"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-[1600ms]",
          phase.arcs ? "opacity-70" : "opacity-0",
        )}
      >
        {[
          { rx: 470, ry: 150, rot: -14, dur: "7s", w: 1 },
          { rx: 560, ry: 210, rot: 9, dur: "9s", w: 0.8 },
          { rx: 380, ry: 108, rot: 22, dur: "6s", w: 0.6 },
        ].map((o, i) => (
          <g key={i} transform={`rotate(${o.rot} 500 560)`}>
            <ellipse
              cx="500"
              cy="560"
              rx={o.rx}
              ry={o.ry}
              fill="none"
              stroke="color-mix(in oklch, var(--primary) 55%, transparent)"
              strokeWidth={o.w}
              strokeDasharray="6 10"
              className="boot-arc"
              style={{ animationDuration: o.dur, animationDelay: `${i * 0.4}s` }}
            />
            <circle r="2.6" fill="var(--signal, var(--primary))">
              <animateMotion
                dur={o.dur}
                repeatCount="indefinite"
                path={`M ${500 + o.rx} 560 A ${o.rx} ${o.ry} 0 1 1 ${500 - o.rx} 560 A ${o.rx} ${o.ry} 0 1 1 ${500 + o.rx} 560`}
              />
            </circle>
          </g>
        ))}
      </svg>

      <button
        onClick={dismiss}
        className="absolute top-5 right-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase backdrop-blur transition-colors hover:text-foreground cursor-pointer"
      >
        <X className="h-3 w-3" /> Skip
      </button>

      {/* 5 — sparse type, 6 — wordmark */}
      <div className="relative z-[1] flex h-full flex-col items-center justify-center px-6 text-center">
        <div
          className={cn(
            "space-y-1.5 transition-all duration-1000",
            phase.lines ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          )}
        >
          <p className="font-mono text-[11px] tracking-[0.35em] text-muted-foreground uppercase">
            Real element sets
          </p>
          <p className="font-mono text-[11px] tracking-[0.35em] text-muted-foreground uppercase">
            Propagated locally with SGP4
          </p>
        </div>

        <h1
          className={cn(
            "font-display mt-8 text-5xl font-bold tracking-[0.18em] text-foreground transition-all duration-[1200ms] sm:text-7xl",
            phase.wordmark ? "scale-100 opacity-100 blur-0" : "scale-[1.06] opacity-0 blur-sm",
          )}
        >
          ORBITAL
        </h1>

        <div
          className={cn(
            "mt-10 flex min-h-5 items-center gap-2 transition-opacity duration-700",
            phase.horizon ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
            {status.text}
          </span>
        </div>

        <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
          {objectCount > 0 ? `${objectCount.toLocaleString()} objects catalogued` : "\u00a0"}
        </p>
      </div>
    </div>
  );
}