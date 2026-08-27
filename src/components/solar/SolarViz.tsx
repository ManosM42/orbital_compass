/**
 * SolarViz — the only mount point for the natural-body scene.
 *
 * Client-only + lazily code-split, so the R3F/three bundle is never pulled in
 * during SSR or on routes that don't show a scene. Every page that needs a
 * planet, moon or system view renders this component, which keeps exactly one
 * scene implementation (`BodyScene`) in the app.
 */

import { Suspense, lazy, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { MoonBody, PlanetBody } from "@/services/solar/solarSystemData";
import type { SceneMode } from "./BodyScene";

const BodyScene = lazy(() => import("./BodyScene"));

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return reduced;
}

interface SolarVizProps {
  mode: SceneMode;
  planet?: PlanetBody;
  moon?: MoonBody;
  focus?: string | null;
  onSelectPlanet?: (slug: string) => void;
  className?: string;
  caption?: string;
}

function Pending({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

export function SolarViz({
  mode,
  planet,
  moon,
  focus,
  onSelectPlanet,
  className,
  caption,
}: SolarVizProps) {
  const [failed, setFailed] = useState(false);
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const quality = isMobile ? "low" : "high";
  const distance = mode === "system" ? 13 : 5;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/70 bg-black",
        className,
      )}
    >
      <ClientOnly fallback={<Pending label="Preparing scene…" />}>
        {failed ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <p className="text-sm text-muted-foreground">
              This browser could not open a WebGL context, so the 3D scene is unavailable. All
              reference data on this page is unaffected.
            </p>
          </div>
        ) : (
          <Suspense fallback={<Pending label="Loading scene…" />}>
            <Canvas
              camera={{ position: [0, distance * 0.42, distance], fov: 45, near: 0.05, far: 400 }}
              dpr={[1, quality === "high" ? 2 : 1.5]}
              gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener("webglcontextlost", () => setFailed(true));
              }}
            >
              <BodyScene
                mode={mode}
                planet={planet}
                moon={moon}
                focus={focus}
                onSelectPlanet={onSelectPlanet}
                reducedMotion={reduced}
                quality={quality}
              />
            </Canvas>
          </Suspense>
        )}
      </ClientOnly>

      {caption && (
        <p className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-8 text-[10px] leading-relaxed text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  );
}
