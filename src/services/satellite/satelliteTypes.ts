/**
 * ORBITAL — shared orbital data types.
 *
 * Everything the UI consumes is derived from real element sets (TLE/OMM)
 * retrieved from a public provider and propagated locally with satellite.js.
 * No position, time or pass in this app is fabricated.
 */

export type SatelliteCategory =
  | "space-station"
  | "starlink"
  | "weather"
  | "navigation"
  | "science"
  | "communication"
  | "earth-observation";

/** Provider groups we retrieve element sets for. */
export type TleGroup = "stations" | "starlink" | "weather" | "gnss" | "science" | "resource";

export interface TLE {
  line1: string;
  line2: string;
}

/** A raw element set exactly as published by the provider. */
export interface TleRecord {
  noradId: number;
  name: string;
  tle: TLE;
  /** International designator (COSPAR ID) from the element set, when present. */
  cosparId?: string;
  /** ISO epoch of the element set itself (when the orbit was measured). */
  epoch: string;
  /** Provider group the record came from. */
  group: TleGroup;
}

/** Curated, factual metadata keyed by NORAD id (never positional data). */
export interface SatelliteMeta {
  noradId: number;
  operator: string;
  country: string;
  category: SatelliteCategory;
  launchDate?: string;
  description?: string;
}

/** A tracked object: real element set + metadata. */
export interface Satellite {
  /** `sat-<noradId>` — stable UI key. Favourites are stored by `noradId`. */
  id: string;
  noradId: number;
  name: string;
  operator: string;
  country: string;
  category: SatelliteCategory;
  launchDate?: string;
  description?: string;
  tle: TLE;
  /** International designator (COSPAR ID), when published in the element set. */
  cosparId?: string;
  /** Element-set epoch (ISO). */
  epoch: string;
  group: TleGroup;
  /** Constellation family inferred from the published object name. */
  constellation?: string;
}

/** Instantaneous geodetic state derived from SGP4. */
export interface GeoPosition {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmS: number;
  /** ISO timestamp the state was propagated for. */
  timestamp: string;
}

export interface SatelliteState {
  satellite: Satellite;
  position: GeoPosition;
  /** true when the satellite is in sunlight (not in Earth's shadow). */
  sunlit: boolean;
}

export interface LookAngles {
  elevationDeg: number;
  azimuthDeg: number;
  rangeKm: number;
}

export interface OverheadSatellite extends LookAngles {
  satellite: Satellite;
  position: GeoPosition;
  sunlit: boolean;
  /** sunlit satellite, observer in darkness, decent elevation and low orbit. */
  nakedEye: boolean;
}

export interface ObserverLocation {
  name: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  /** how the location was obtained. */
  source: "preset" | "geolocation" | "manual";
}

export interface PassPrediction {
  id: string;
  satelliteId: string;
  noradId: number;
  satelliteName: string;
  startTime: string;
  peakTime: string;
  endTime: string;
  durationSec: number;
  maxElevationDeg: number;
  startAzimuthDeg: number;
  endAzimuthDeg: number;
  peakAzimuthDeg: number;
  peakRangeKm: number;
  /** sunlit satellite + dark sky at peak. */
  visibility: "visible" | "daylight" | "eclipsed";
  quality: "excellent" | "good" | "fair";
}

/* ------------------------------------------------------------------ */
/* Data freshness                                                      */
/* ------------------------------------------------------------------ */

export type DataStatus = "loading" | "live" | "stale" | "offline" | "error";

export interface DataSourceInfo {
  /** Provider that served the records. */
  provider: string;
  providerLabel: string;
  /** ISO time the records were retrieved. */
  fetchedAt: string;
  /** true when the payload was served from a provider-side or local cache. */
  cached: boolean;
}

export interface TleFetchResult {
  records: TleRecord[];
  source: DataSourceInfo;
}

/** Provider abstraction — implemented server-side only. */
export interface TleProvider {
  id: string;
  label: string;
  /** whether the provider needs a secret; keys are read server-side only. */
  requiresKey: boolean;
  isConfigured(): boolean;
  fetchGroup(group: TleGroup): Promise<TleFetchResult>;
}

export interface CrewMember {
  name: string;
  craft: string;
  agency: string;
  role: string;
  daysAboard: number;
}

export interface IssCrewResult {
  expedition: number | null;
  crew: CrewMember[];
  source: DataSourceInfo;
}

/* ------------------------------------------------------------------ */
/* Catalog + search (renderer-independent)                             */
/* ------------------------------------------------------------------ */

/**
 * A lightweight catalog row. Carries identifiers and factual metadata only —
 * never a position. Positions are only computed for objects the user selects.
 */
export interface CatalogEntry {
  noradId: number;
  name: string;
  cosparId?: string;
  operator: string;
  country: string;
  category: SatelliteCategory;
  constellation?: string;
  group: TleGroup;
  /** Element-set epoch (ISO) — the age of the published orbit. */
  epoch: string;
}

/** Wire shape of the catalog index: identifiers only, no metadata joins. */
export interface CatalogRow {
  noradId: number;
  name: string;
  cosparId?: string;
  group: TleGroup;
  epoch: string;
}

export interface CatalogIndexPayload {
  rows: CatalogRow[];
  source: DataSourceInfo;
  failedGroups: TleGroup[];
}

export interface CatalogIndexResult {
  entries: CatalogEntry[];
  source: DataSourceInfo;
  /** Groups whose retrieval failed; the index is partial when non-empty. */
  failedGroups: TleGroup[];
}
