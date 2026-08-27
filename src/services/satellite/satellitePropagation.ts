/**
 * Local SGP4 propagation (satellite.js).
 *
 * Everything positional in ORBITAL is computed here from real element sets:
 * live positions, ground tracks / predicted orbit trails, look angles for an
 * observer, illumination and pass predictions.
 */

import {
  degreesLat,
  degreesLong,
  degreesToRadians,
  ecfToLookAngles,
  eciToEcf,
  eciToGeodetic,
  gstime,
  jday,
  propagate,
  radiansToDegrees,
  shadowFraction,
  sunPos,
  twoline2satrec,
  type SatRec,
} from "@/lib/satellitejs";

import type {
  GeoPosition,
  LookAngles,
  ObserverLocation,
  PassPrediction,
  Satellite,
  SatelliteState,
} from "./satelliteTypes";

/* ------------------------------------------------------------------ */
/* satrec memoisation                                                  */
/* ------------------------------------------------------------------ */

const satrecCache = new Map<string, SatRec | null>();

export function getSatrec(sat: Satellite): SatRec | null {
  const key = `${sat.noradId}:${sat.tle.line1.slice(18, 32)}`;
  const hit = satrecCache.get(key);
  if (hit !== undefined) return hit;
  let rec: SatRec | null = null;
  try {
    rec = twoline2satrec(sat.tle.line1, sat.tle.line2);
    if (rec.error) rec = null;
  } catch {
    rec = null;
  }
  satrecCache.set(key, rec);
  return rec;
}

/* ------------------------------------------------------------------ */
/* Core state                                                          */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_KM = 6371;

export function propagateState(sat: Satellite, date: Date): SatelliteState | null {
  const rec = getSatrec(sat);
  if (!rec) return null;
  const pv = propagate(rec, date);
  if (!pv || rec.error) return null;

  const gmst = gstime(date);
  const geo = eciToGeodetic(pv.position, gmst);
  const speed = Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z);
  const sun = sunPos(jday(date));
  const shadow = shadowFraction(sun.rsun, pv.position);

  return {
    satellite: sat,
    position: {
      latitude: degreesLat(geo.latitude),
      longitude: degreesLong(geo.longitude),
      altitudeKm: geo.height,
      velocityKmS: speed,
      timestamp: date.toISOString(),
    },
    sunlit: shadow < 0.5,
  };
}

export function propagateMany(sats: Satellite[], date: Date): SatelliteState[] {
  const out: SatelliteState[] = [];
  for (const s of sats) {
    const st = propagateState(s, date);
    if (st) out.push(st);
  }
  return out;
}

/** Orbital period in minutes derived from the element set's mean motion. */
export function orbitalPeriodMin(sat: Satellite): number | null {
  const rec = getSatrec(sat);
  if (!rec || !rec.no) return null;
  return (2 * Math.PI) / rec.no;
}

export function inclinationDeg(sat: Satellite): number | null {
  const rec = getSatrec(sat);
  return rec ? radiansToDegrees(rec.inclo) : null;
}

export interface ApsisKm {
  apogeeKm: number;
  perigeeKm: number;
}

export function apsides(sat: Satellite): ApsisKm | null {
  const rec = getSatrec(sat);
  if (!rec) return null;
  return {
    apogeeKm: rec.alta * EARTH_RADIUS_KM,
    perigeeKm: rec.altp * EARTH_RADIUS_KM,
  };
}

/* ------------------------------------------------------------------ */
/* Predicted orbit trail (ground track)                                */
/* ------------------------------------------------------------------ */

export interface TrailPoint {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  /** minutes relative to `from` (negative = past). */
  offsetMin: number;
}

/**
 * Ground track sampled from SGP4. Defaults to one full revolution centred on
 * the current time so the UI can draw both past and predicted path.
 */
export function groundTrack(
  sat: Satellite,
  from: Date,
  opts: { pastMin?: number; futureMin?: number; stepMin?: number } = {},
): TrailPoint[] {
  const rec = getSatrec(sat);
  if (!rec) return [];
  const period = orbitalPeriodMin(sat) ?? 95;
  const past = opts.pastMin ?? Math.min(period * 0.35, 60);
  const future = opts.futureMin ?? Math.min(period * 0.65, 120);
  const step = opts.stepMin ?? Math.max(0.5, (past + future) / 90);

  const points: TrailPoint[] = [];
  for (let t = -past; t <= future; t += step) {
    const d = new Date(from.getTime() + t * 60000);
    const pv = propagate(rec, d);
    if (!pv || rec.error) continue;
    const geo = eciToGeodetic(pv.position, gstime(d));
    points.push({
      latitude: degreesLat(geo.latitude),
      longitude: degreesLong(geo.longitude),
      altitudeKm: geo.height,
      offsetMin: t,
    });
  }
  return points;
}

/* ------------------------------------------------------------------ */
/* Observer geometry                                                   */
/* ------------------------------------------------------------------ */

function observerGd(observer: ObserverLocation) {
  return {
    longitude: degreesToRadians(observer.longitude),
    latitude: degreesToRadians(observer.latitude),
    height: observer.altitudeM / 1000,
  };
}

export function lookAnglesAt(
  sat: Satellite,
  observer: ObserverLocation,
  date: Date,
): (LookAngles & { position: GeoPosition; sunlit: boolean }) | null {
  const rec = getSatrec(sat);
  if (!rec) return null;
  const pv = propagate(rec, date);
  if (!pv || rec.error) return null;
  const gmst = gstime(date);
  const ecf = eciToEcf(pv.position, gmst);
  const la = ecfToLookAngles(observerGd(observer), ecf);
  const geo = eciToGeodetic(pv.position, gmst);
  const sun = sunPos(jday(date));
  return {
    elevationDeg: radiansToDegrees(la.elevation),
    azimuthDeg: (radiansToDegrees(la.azimuth) + 360) % 360,
    rangeKm: la.rangeSat,
    sunlit: shadowFraction(sun.rsun, pv.position) < 0.5,
    position: {
      latitude: degreesLat(geo.latitude),
      longitude: degreesLong(geo.longitude),
      altitudeKm: geo.height,
      velocityKmS: Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z),
      timestamp: date.toISOString(),
    },
  };
}

/** Solar elevation at the observer — used to know whether the sky is dark. */
export function sunElevationDeg(observer: ObserverLocation, date: Date): number {
  const sun = sunPos(jday(date));
  const AU_KM = 149597870.7;
  const eci = { x: sun.rsun.x * AU_KM, y: sun.rsun.y * AU_KM, z: sun.rsun.z * AU_KM };
  const ecf = eciToEcf(eci, gstime(date));
  const la = ecfToLookAngles(observerGd(observer), ecf);
  return radiansToDegrees(la.elevation);
}

/* ------------------------------------------------------------------ */
/* Pass prediction                                                     */
/* ------------------------------------------------------------------ */

export interface PassOptions {
  /** hours ahead to search. */
  hours?: number;
  /** minimum peak elevation to report. */
  minElevationDeg?: number;
  /** coarse scan step in seconds. */
  coarseStepSec?: number;
}

function quality(el: number): PassPrediction["quality"] {
  if (el >= 60) return "excellent";
  if (el >= 30) return "good";
  return "fair";
}

/**
 * Brute-force SGP4 pass search: coarse scan for horizon crossings, then a
 * fine 5 s refinement inside each window. Runs entirely locally.
 */
export function predictPasses(
  sat: Satellite,
  observer: ObserverLocation,
  from: Date,
  opts: PassOptions = {},
): PassPrediction[] {
  const rec = getSatrec(sat);
  if (!rec) return [];
  const hours = opts.hours ?? 72;
  const minEl = opts.minElevationDeg ?? 10;
  const coarse = opts.coarseStepSec ?? 30;
  const gd = observerGd(observer);
  const endMs = from.getTime() + hours * 3600_000;

  const elevationAt = (ms: number): number | null => {
    const d = new Date(ms);
    const pv = propagate(rec, d);
    if (!pv || rec.error) return null;
    const la = ecfToLookAngles(gd, eciToEcf(pv.position, gstime(d)));
    return radiansToDegrees(la.elevation);
  };

  const sample = (ms: number) => {
    const d = new Date(ms);
    const pv = propagate(rec, d);
    if (!pv || rec.error) return null;
    const gmst = gstime(d);
    const la = ecfToLookAngles(gd, eciToEcf(pv.position, gmst));
    const sun = sunPos(jday(d));
    return {
      el: radiansToDegrees(la.elevation),
      az: (radiansToDegrees(la.azimuth) + 360) % 360,
      range: la.rangeSat,
      sunlit: shadowFraction(sun.rsun, pv.position) < 0.5,
    };
  };

  const passes: PassPrediction[] = [];
  let ms = from.getTime();
  let prevEl = elevationAt(ms) ?? -90;

  while (ms < endMs) {
    const nextMs = ms + coarse * 1000;
    const el = elevationAt(nextMs);
    if (el === null) break;

    if (prevEl < 0 && el >= 0) {
      // refine rise, walk the pass at 5 s
      let t = ms;
      let start = nextMs;
      for (let r = ms; r <= nextMs; r += 5000) {
        const e = elevationAt(r);
        if (e !== null && e >= 0) {
          start = r;
          break;
        }
      }
      t = start;
      let peak = sample(start);
      let peakMs = start;
      let end = start;
      for (let s = start; s < endMs; s += 5000) {
        const cur = sample(s);
        if (!cur) break;
        if (cur.el < 0) {
          end = s;
          break;
        }
        if (!peak || cur.el > peak.el) {
          peak = cur;
          peakMs = s;
        }
        end = s;
      }
      const startSample = sample(start);
      const endSample = sample(end);
      if (peak && startSample && endSample && peak.el >= minEl) {
        const sunEl = sunElevationDeg(observer, new Date(peakMs));
        const visibility: PassPrediction["visibility"] =
          sunEl > -6 ? "daylight" : peak.sunlit ? "visible" : "eclipsed";
        passes.push({
          id: `pass-${sat.noradId}-${start}`,
          satelliteId: sat.id,
          noradId: sat.noradId,
          satelliteName: sat.name,
          startTime: new Date(start).toISOString(),
          peakTime: new Date(peakMs).toISOString(),
          endTime: new Date(end).toISOString(),
          durationSec: Math.round((end - start) / 1000),
          maxElevationDeg: Math.round(peak.el * 10) / 10,
          startAzimuthDeg: Math.round(startSample.az),
          endAzimuthDeg: Math.round(endSample.az),
          peakAzimuthDeg: Math.round(peak.az),
          peakRangeKm: Math.round(peak.range),
          visibility,
          quality: quality(peak.el),
        });
      }
      // continue coarse scanning after the pass
      ms = end + coarse * 1000;
      prevEl = elevationAt(ms) ?? -90;
      void t;
      continue;
    }

    prevEl = el;
    ms = nextMs;
  }

  return passes;
}

export function predictPassesForMany(
  sats: Satellite[],
  observer: ObserverLocation,
  from: Date,
  opts: PassOptions = {},
): PassPrediction[] {
  return sats
    .flatMap((s) => predictPasses(s, observer, from, opts))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

export function compass(deg: number) {
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16]!;
}
