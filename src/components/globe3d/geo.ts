/**
 * Scene geometry helpers for the WebGL globe.
 *
 * Everything is rendered in an Earth-fixed (ECEF) frame: the planet stays put,
 * satellites move across it exactly as their SGP4-derived geodetic positions
 * dictate, and the Sun sweeps around once per sidereal day, which is what
 * drives the day/night terminator.
 */

import { Vector3 } from "three";
import { eciToEcf, gstime, jday, sunPos } from "@/lib/satellitejs";
import type { SatelliteCategory } from "@/services/satellite/satelliteTypes";

export const EARTH_RADIUS_KM = 6371;
/** Earth radius in scene units. */
export const R = 1;
const DEG = Math.PI / 180;

/** Geodetic degrees + altitude (km) → scene position. */
export function geoToVec3(
  latDeg: number,
  lonDeg: number,
  altKm = 0,
  target = new Vector3(),
): Vector3 {
  const r = R * (1 + altKm / EARTH_RADIUS_KM);
  const phi = (90 - latDeg) * DEG;
  const theta = (lonDeg + 90) * DEG; // matches three's SphereGeometry UV layout
  return target.setFromSphericalCoords(r, phi, theta);
}

/** Unit vector towards the Sun in the Earth-fixed frame. */
export function sunDirection(date: Date, target = new Vector3()): Vector3 {
  const AU_KM = 149597870.7;
  const s = sunPos(jday(date));
  const eci = { x: s.rsun.x * AU_KM, y: s.rsun.y * AU_KM, z: s.rsun.z * AU_KM };
  const ecf = eciToEcf(eci, gstime(date));
  // ECEF (x towards 0°/0°, z towards north pole) → scene axes used by geoToVec3.
  const lat = Math.atan2(ecf.z, Math.hypot(ecf.x, ecf.y)) / DEG;
  const lon = Math.atan2(ecf.y, ecf.x) / DEG;
  return geoToVec3(lat, lon, 0, target).normalize();
}

export const CATEGORY_COLOR: Record<SatelliteCategory, string> = {
  "space-station": "#ff8a4c",
  starlink: "#4cc9f0",
  navigation: "#b388ff",
  weather: "#8ee6a0",
  science: "#ffd166",
  communication: "#7dd3fc",
  "earth-observation": "#a3e635",
};

export function colorFor(cat: SatelliteCategory): string {
  return CATEGORY_COLOR[cat] ?? "#8ee6a0";
}

/** Coarse model archetype for a category. */
export type ModelKind = "iss" | "starlink" | "gps" | "weather" | "generic";

export function modelKind(cat: SatelliteCategory): ModelKind {
  if (cat === "space-station") return "iss";
  if (cat === "starlink") return "starlink";
  if (cat === "navigation") return "gps";
  if (cat === "weather") return "weather";
  return "generic";
}
