/**
 * Incremental pass prediction.
 *
 * SGP4 pass searches are CPU-bound, so satellites are processed one at a time
 * across animation frames — results stream into the UI and the page stays
 * responsive.
 */

import { useEffect, useMemo, useState } from "react";

import { predictPasses, type PassOptions } from "./satellitePropagation";
import type { ObserverLocation, PassPrediction, Satellite } from "./satelliteTypes";

export interface PassComputation {
  passes: PassPrediction[];
  progress: number;
  computing: boolean;
}

export function usePassPredictions(
  satellites: Satellite[],
  observer: ObserverLocation,
  opts: PassOptions & { enabled?: boolean } = {},
): PassComputation {
  const { enabled = true, ...passOpts } = opts;
  const [passes, setPasses] = useState<PassPrediction[]>([]);
  const [done, setDone] = useState(0);

  const key = useMemo(
    () =>
      [
        satellites.map((s) => s.noradId).join(","),
        observer.latitude,
        observer.longitude,
        passOpts.hours ?? 72,
        passOpts.minElevationDeg ?? 10,
      ].join("|"),
    [satellites, observer.latitude, observer.longitude, passOpts.hours, passOpts.minElevationDeg],
  );

  useEffect(() => {
    if (!enabled || satellites.length === 0) {
      setPasses([]);
      setDone(0);
      return;
    }
    let cancelled = false;
    const from = new Date();
    const collected: PassPrediction[] = [];
    setPasses([]);
    setDone(0);

    let index = 0;
    const step = () => {
      if (cancelled) return;
      const sat = satellites[index];
      if (!sat) return;
      collected.push(...predictPasses(sat, observer, from, passOpts));
      index += 1;
      setDone(index);
      setPasses([...collected].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      if (index < satellites.length) {
        window.setTimeout(step, 0);
      }
    };
    const id = window.setTimeout(step, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return {
    passes,
    progress: satellites.length ? done / satellites.length : 1,
    computing: enabled && done < satellites.length,
  };
}
