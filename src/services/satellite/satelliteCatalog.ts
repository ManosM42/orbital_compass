/**
 * Curated, factual metadata for well-known objects, keyed by NORAD id.
 * Contains no positional or timing data — those always come from live
 * element sets propagated with SGP4.
 */

import type { SatelliteCategory, SatelliteMeta, TleGroup } from "./satelliteTypes";

export const CATEGORY_LABELS: Record<SatelliteCategory, string> = {
  "space-station": "Space Stations",
  starlink: "Starlink",
  weather: "Weather",
  navigation: "Navigation",
  science: "Science",
  communication: "Communication",
  "earth-observation": "Earth Observation",
};

export const GROUP_CATEGORY: Record<TleGroup, SatelliteCategory> = {
  stations: "space-station",
  starlink: "starlink",
  weather: "weather",
  gnss: "navigation",
  science: "science",
  resource: "earth-observation",
};

export const GROUP_LABELS: Record<TleGroup, string> = {
  stations: "Space stations",
  starlink: "Starlink",
  weather: "Weather",
  gnss: "Navigation (GNSS)",
  science: "Science",
  resource: "Earth resources",
};

export const ISS_NORAD_ID = 25544;

const META: SatelliteMeta[] = [
  {
    noradId: 25544,
    operator: "NASA / Roscosmos / ESA / JAXA / CSA",
    country: "International",
    category: "space-station",
    launchDate: "1998-11-20",
    description:
      "The largest human-made object in low Earth orbit. Continuously crewed since November 2000.",
  },
  {
    noradId: 48274,
    operator: "CMSA",
    country: "China",
    category: "space-station",
    launchDate: "2021-04-29",
    description: "Tianhe core module of the Chinese Tiangong space station.",
  },
  {
    noradId: 20580,
    operator: "NASA / ESA",
    country: "United States",
    category: "science",
    launchDate: "1990-04-24",
    description: "Optical space observatory that redefined modern astronomy.",
  },
  {
    noradId: 43013,
    operator: "NOAA",
    country: "United States",
    category: "weather",
    launchDate: "2017-11-18",
    description: "Polar-orbiting weather satellite delivering global forecasts twice daily.",
  },
  {
    noradId: 39084,
    operator: "NASA / USGS",
    country: "United States",
    category: "earth-observation",
    launchDate: "2013-02-11",
    description: "Continuing the longest continuous record of Earth's land surface.",
  },
  {
    noradId: 40697,
    operator: "ESA / Copernicus",
    country: "European Union",
    category: "earth-observation",
    launchDate: "2015-06-23",
    description: "Multispectral imager supporting agriculture, forestry and disaster response.",
  },
  {
    noradId: 33591,
    operator: "NOAA",
    country: "United States",
    category: "weather",
    launchDate: "2009-02-06",
    description: "APT downlink favourite among amateur weather-image receivers.",
  },
  {
    noradId: 25338,
    operator: "NOAA",
    country: "United States",
    category: "weather",
    launchDate: "1998-05-13",
    description: "Veteran polar orbiter, still transmitting after a quarter century.",
  },
  {
    noradId: 27424,
    operator: "NASA",
    country: "United States",
    category: "earth-observation",
    launchDate: "2002-05-04",
    description: "Water-cycle observatory anchoring the A-Train constellation.",
  },
  {
    noradId: 43226,
    operator: "NASA / MIT",
    country: "United States",
    category: "science",
    launchDate: "2018-04-18",
    description: "All-sky survey hunting transiting exoplanets around bright nearby stars.",
  },
];

const BY_ID = new Map(META.map((m) => [m.noradId, m]));

/** Operator/country inferred from the object name when not curated. */
function inferOperator(name: string, group: TleGroup): { operator: string; country: string } {
  const n = name.toUpperCase();
  if (n.startsWith("STARLINK")) return { operator: "SpaceX", country: "United States" };
  if (n.startsWith("ONEWEB")) return { operator: "Eutelsat OneWeb", country: "United Kingdom" };
  if (n.startsWith("NOAA") || n.startsWith("GOES")) return { operator: "NOAA", country: "United States" };
  if (n.startsWith("METOP") || n.startsWith("SENTINEL")) return { operator: "ESA / EUMETSAT", country: "European Union" };
  if (n.startsWith("GPS") || n.startsWith("NAVSTAR")) return { operator: "US Space Force", country: "United States" };
  if (n.startsWith("GALILEO")) return { operator: "EUSPA", country: "European Union" };
  if (n.startsWith("GLONASS") || n.startsWith("COSMOS")) return { operator: "Roscosmos", country: "Russia" };
  if (n.startsWith("BEIDOU")) return { operator: "CNSA", country: "China" };
  if (n.startsWith("CSS") || n.startsWith("TIANHE")) return { operator: "CMSA", country: "China" };
  if (n.startsWith("LANDSAT") || n.startsWith("TERRA") || n.startsWith("AQUA"))
    return { operator: "NASA / USGS", country: "United States" };
  return { operator: group === "starlink" ? "SpaceX" : "Unknown operator", country: "—" };
}

export function metaFor(noradId: number, name: string, group: TleGroup): SatelliteMeta {
  const curated = BY_ID.get(noradId);
  if (curated) return curated;
  const { operator, country } = inferOperator(name, group);
  return { noradId, operator, country, category: GROUP_CATEGORY[group] };
}

/* ------------------------------------------------------------------ */
/* Constellation families (inferred from the published object name)    */
/* ------------------------------------------------------------------ */

const CONSTELLATIONS: [RegExp, string][] = [
  [/^STARLINK/, "Starlink"],
  [/^ONEWEB/, "OneWeb"],
  [/^IRIDIUM/, "Iridium NEXT"],
  [/^GLOBALSTAR/, "Globalstar"],
  [/^(NAVSTAR|GPS)/, "GPS"],
  [/^GALILEO/, "Galileo"],
  [/^(GLONASS|COSMOS 2\d{3})/, "GLONASS"],
  [/^BEIDOU/, "BeiDou"],
  [/^NOAA/, "NOAA POES"],
  [/^GOES/, "GOES"],
  [/^METOP/, "MetOp"],
  [/^SENTINEL/, "Copernicus Sentinel"],
  [/^LANDSAT/, "Landsat"],
  [/^(ISS|CSS|TIANHE|ZARYA)/, "Crewed stations"],
  [/^PLANET|^FLOCK|^SKYSAT/, "Planet"],
];

/** Returns the constellation family for a name, or undefined when unknown. */
export function constellationFor(name: string): string | undefined {
  const n = name.toUpperCase();
  for (const [re, label] of CONSTELLATIONS) if (re.test(n)) return label;
  return undefined;
}
