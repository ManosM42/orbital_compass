/**
 * ORBITAL — Solar System reference data.
 *
 * IMPORTANT — data honesty contract:
 * Everything in this module is *static scientific reference data* for natural
 * bodies (planets, dwarf-planet-class moons, major moons). These values are
 * slow-changing published constants (radii, masses, orbital periods, discovery
 * facts), NOT live measurements and NOT propagated positions.
 *
 * Nothing here is presented in the UI as "live". Artificial-satellite state
 * (position/velocity/passes) is the only thing this app computes in real time,
 * and it comes exclusively from `src/services/satellite/*` (published element
 * sets + local SGP4).
 *
 * Figures are rounded published values (IAU / NASA planetary fact sheets).
 */

export type BodyKind = "star" | "planet" | "moon";

export interface BodyFact {
  label: string;
  /** Rendered verbatim. Use `undefined` to render "Data unavailable". */
  value: string | undefined;
}

export interface MoonBody {
  slug: string;
  name: string;
  kind: "moon";
  parent: string;
  /** Mean radius, km. */
  radiusKm: number;
  /** Mean orbital radius around its planet, km. */
  orbitRadiusKm: number;
  /** Sidereal orbital period, days. */
  orbitalPeriodDays: number;
  massKg?: number;
  discovery?: string;
  atmosphere?: string;
  surface: string;
  color: string;
  accent: string;
  tagline: string;
  summary: string;
  highlights: string[];
}

export interface PlanetBody {
  slug: string;
  name: string;
  kind: "planet";
  order: number;
  /** Mean radius, km. */
  radiusKm: number;
  massKg: number;
  /** Semi-major axis, AU. */
  semiMajorAxisAu: number;
  /** Sidereal orbital period, Earth years. */
  orbitalPeriodYears: number;
  /** Sidereal rotation period, hours (negative = retrograde). */
  rotationPeriodHours: number;
  axialTiltDeg: number;
  meanTemperatureC: number;
  gravityMs2: number;
  moonCount: number;
  hasRings: boolean;
  atmosphere: string;
  color: string;
  accent: string;
  ringColor?: string;
  tagline: string;
  summary: string;
  highlights: string[];
  moons: MoonBody[];
}

export const SUN = {
  name: "Sun",
  kind: "star" as const,
  radiusKm: 695_700,
  massKg: 1.989e30,
  surfaceTemperatureK: 5772,
  color: "#ffcf6b",
  accent: "#ff8a3c",
  summary:
    "A G2V main-sequence star holding 99.86% of the Solar System's mass. Every orbit shown in this app — natural or artificial — is ultimately bound to it.",
};

function moon(m: MoonBody): MoonBody {
  return m;
}

export const PLANETS: PlanetBody[] = [
  {
    slug: "mercury",
    name: "Mercury",
    kind: "planet",
    order: 1,
    radiusKm: 2439.7,
    massKg: 3.301e23,
    semiMajorAxisAu: 0.387,
    orbitalPeriodYears: 0.241,
    rotationPeriodHours: 1407.6,
    axialTiltDeg: 0.034,
    meanTemperatureC: 167,
    gravityMs2: 3.7,
    moonCount: 0,
    hasRings: false,
    atmosphere: "Negligible exosphere (O, Na, H, He, K)",
    color: "#9a8f86",
    accent: "#d8c7b4",
    tagline: "The fastest, most cratered world",
    summary:
      "The smallest planet and the closest to the Sun, locked in a 3:2 spin–orbit resonance so a single solar day lasts two Mercurian years.",
    highlights: [
      "Surface swings roughly 430 °C between day and night — the largest range of any planet.",
      "Water ice persists in permanently shadowed polar craters despite the proximity to the Sun.",
      "Its oversized iron core makes up about 85% of the planet's radius.",
    ],
    moons: [],
  },
  {
    slug: "venus",
    name: "Venus",
    kind: "planet",
    order: 2,
    radiusKm: 6051.8,
    massKg: 4.867e24,
    semiMajorAxisAu: 0.723,
    orbitalPeriodYears: 0.615,
    rotationPeriodHours: -5832.5,
    axialTiltDeg: 177.4,
    meanTemperatureC: 464,
    gravityMs2: 8.87,
    moonCount: 0,
    hasRings: false,
    atmosphere: "96.5% CO₂, 3.5% N₂, sulfuric-acid cloud decks",
    color: "#d9a441",
    accent: "#f5d99b",
    tagline: "A runaway greenhouse",
    summary:
      "Earth's near-twin in size and bulk composition, wrapped in a 92-bar carbon-dioxide atmosphere that keeps the surface hot enough to melt lead.",
    highlights: [
      "Rotates retrograde and slower than it orbits — one Venusian day is longer than its year.",
      "Cloud tops super-rotate around the planet in about four Earth days.",
      "Radar mapping shows a young, volcanically resurfaced crust with few impact craters.",
    ],
    moons: [],
  },
  {
    slug: "earth",
    name: "Earth",
    kind: "planet",
    order: 3,
    radiusKm: 6371,
    massKg: 5.972e24,
    semiMajorAxisAu: 1,
    orbitalPeriodYears: 1,
    rotationPeriodHours: 23.93,
    axialTiltDeg: 23.44,
    meanTemperatureC: 15,
    gravityMs2: 9.807,
    moonCount: 1,
    hasRings: false,
    atmosphere: "78% N₂, 21% O₂, 0.9% Ar, trace CO₂ and H₂O",
    color: "#2f6fb2",
    accent: "#8ee6a0",
    tagline: "The only world with tracked traffic",
    summary:
      "The reference frame for everything else in ORBITAL. Earth is the one planet here whose orbital neighbourhood is populated by thousands of artificial satellites that this app propagates live.",
    highlights: [
      "Roughly 11,000 active artificial satellites currently share this orbital environment.",
      "The magnetosphere deflects the solar wind and shapes the radiation belts spacecraft must survive.",
      "Axial tilt of 23.44° drives the seasons and the terminator you see on the live globe.",
    ],
    moons: [
      moon({
        slug: "moon",
        name: "The Moon",
        kind: "moon",
        parent: "earth",
        radiusKm: 1737.4,
        orbitRadiusKm: 384_400,
        orbitalPeriodDays: 27.32,
        massKg: 7.342e22,
        discovery: "Known since prehistory",
        atmosphere: "Trace exosphere (Ar, He, Na)",
        surface: "Anorthositic highlands and basaltic maria, heavily cratered",
        color: "#c9c5bd",
        accent: "#8f8b85",
        tagline: "Earth's tidally locked companion",
        summary:
          "The fifth-largest moon in the Solar System and the only other body humans have walked on. Tidal locking keeps one hemisphere permanently facing Earth.",
        highlights: [
          "Recedes from Earth by about 3.8 cm per year.",
          "Surface gravity is 1.62 m/s², about one sixth of Earth's.",
          "Permanently shadowed polar craters hold water ice deposits.",
        ],
      }),
    ],
  },
  {
    slug: "mars",
    name: "Mars",
    kind: "planet",
    order: 4,
    radiusKm: 3389.5,
    massKg: 6.417e23,
    semiMajorAxisAu: 1.524,
    orbitalPeriodYears: 1.881,
    rotationPeriodHours: 24.62,
    axialTiltDeg: 25.19,
    meanTemperatureC: -65,
    gravityMs2: 3.71,
    moonCount: 2,
    hasRings: false,
    atmosphere: "95% CO₂, 2.6% N₂, 1.9% Ar — about 6 mbar",
    color: "#c1543a",
    accent: "#f0a07a",
    tagline: "The most visited world after Earth",
    summary:
      "A cold desert planet with polar ice caps, ancient river valleys and the tallest volcano in the Solar System. Multiple orbiters and rovers operate there today.",
    highlights: [
      "Olympus Mons rises about 22 km — roughly two and a half times the height of Everest.",
      "Valles Marineris stretches over 4,000 km across the equator.",
      "Global dust storms can obscure the entire surface for weeks.",
    ],
    moons: [
      moon({
        slug: "phobos",
        name: "Phobos",
        kind: "moon",
        parent: "mars",
        radiusKm: 11.27,
        orbitRadiusKm: 9376,
        orbitalPeriodDays: 0.319,
        massKg: 1.0659e16,
        discovery: "Asaph Hall, 1877",
        surface: "Carbonaceous, grooved regolith dominated by Stickney crater",
        color: "#8a7f74",
        accent: "#b9ab9c",
        tagline: "Spiralling inward",
        summary:
          "The larger, inner Martian moon. It orbits below synchronous altitude and is slowly spiralling toward Mars.",
        highlights: [
          "Completes an orbit in under 8 hours — it rises in the west from the surface.",
          "Expected to break up or impact within roughly 30–50 million years.",
        ],
      }),
      moon({
        slug: "deimos",
        name: "Deimos",
        kind: "moon",
        parent: "mars",
        radiusKm: 6.2,
        orbitRadiusKm: 23_463,
        orbitalPeriodDays: 1.263,
        massKg: 1.4762e15,
        discovery: "Asaph Hall, 1877",
        surface: "Smooth regolith blanket over a cratered body",
        color: "#9c8f81",
        accent: "#cbbdab",
        tagline: "The smaller outer moon",
        summary:
          "The outer and smaller of Mars' two moons, likely a captured asteroid or accretion remnant.",
        highlights: [
          "Escape velocity is about 5.6 m/s — a person could throw an object off it.",
          "Its regolith fills craters, giving it a noticeably smoother look than Phobos.",
        ],
      }),
    ],
  },
  {
    slug: "jupiter",
    name: "Jupiter",
    kind: "planet",
    order: 5,
    radiusKm: 69_911,
    massKg: 1.898e27,
    semiMajorAxisAu: 5.204,
    orbitalPeriodYears: 11.862,
    rotationPeriodHours: 9.93,
    axialTiltDeg: 3.13,
    meanTemperatureC: -110,
    gravityMs2: 24.79,
    moonCount: 95,
    hasRings: true,
    atmosphere: "90% H₂, 10% He, traces of CH₄, NH₃, H₂O",
    color: "#c8a06a",
    accent: "#e8d3ad",
    ringColor: "#8c7a5f",
    tagline: "The gravitational anchor of the outer system",
    summary:
      "The most massive planet, with a banded hydrogen atmosphere, a faint dust ring system and a family of 90+ known moons including four planet-sized Galileans.",
    highlights: [
      "Rotates in under 10 hours, flattening it visibly at the poles.",
      "The Great Red Spot is a storm wider than Earth that has been observed for centuries.",
      "Its magnetosphere is the largest structure in the Solar System after the heliosphere.",
    ],
    moons: [
      moon({
        slug: "io",
        name: "Io",
        kind: "moon",
        parent: "jupiter",
        radiusKm: 1821.6,
        orbitRadiusKm: 421_700,
        orbitalPeriodDays: 1.769,
        massKg: 8.932e22,
        discovery: "Galileo Galilei, 1610",
        atmosphere: "Thin SO₂",
        surface: "Sulfur plains resurfaced by continuous volcanism",
        color: "#e5d16a",
        accent: "#f5efc0",
        tagline: "The most volcanic body known",
        summary:
          "Tidal flexing from Jupiter and the other Galileans drives hundreds of active volcanoes, resurfacing Io faster than craters can accumulate.",
        highlights: [
          "Plumes reach up to 500 km above the surface.",
          "Has essentially no impact craters — the surface is geologically brand new.",
        ],
      }),
      moon({
        slug: "europa",
        name: "Europa",
        kind: "moon",
        parent: "jupiter",
        radiusKm: 1560.8,
        orbitRadiusKm: 671_034,
        orbitalPeriodDays: 3.551,
        massKg: 4.8e22,
        discovery: "Galileo Galilei, 1610",
        atmosphere: "Tenuous O₂",
        surface: "Fractured water-ice shell over a probable global ocean",
        color: "#dfe6ef",
        accent: "#9fc4e8",
        tagline: "A candidate ocean world",
        summary:
          "Beneath a smooth ice shell crossed by reddish linea, Europa likely holds a salty ocean with more liquid water than all of Earth's.",
        highlights: [
          "Smoothest solid surface in the Solar System.",
          "A prime astrobiology target for current and planned missions.",
        ],
      }),
      moon({
        slug: "ganymede",
        name: "Ganymede",
        kind: "moon",
        parent: "jupiter",
        radiusKm: 2634.1,
        orbitRadiusKm: 1_070_412,
        orbitalPeriodDays: 7.155,
        massKg: 1.4819e23,
        discovery: "Galileo Galilei, 1610",
        atmosphere: "Thin O₂",
        surface: "Mixed dark cratered terrain and bright grooved terrain",
        color: "#b0a596",
        accent: "#e2dbcd",
        tagline: "The largest moon in the Solar System",
        summary:
          "Bigger than Mercury, and the only moon known to generate its own magnetic field from an internal liquid-iron core.",
        highlights: [
          "Radius 2,634 km — larger than the planet Mercury.",
          "Has its own magnetosphere nested inside Jupiter's.",
        ],
      }),
      moon({
        slug: "callisto",
        name: "Callisto",
        kind: "moon",
        parent: "jupiter",
        radiusKm: 2410.3,
        orbitRadiusKm: 1_882_709,
        orbitalPeriodDays: 16.689,
        massKg: 1.0759e23,
        discovery: "Galileo Galilei, 1610",
        atmosphere: "Very thin CO₂",
        surface: "The most heavily cratered surface known",
        color: "#7d7469",
        accent: "#b6ac9f",
        tagline: "An ancient, saturated surface",
        summary:
          "The outermost Galilean moon, geologically inert and saturated with impact craters, sitting outside Jupiter's harshest radiation belts.",
        highlights: [
          "Surface age is estimated at about 4 billion years.",
          "Lower radiation makes it a frequently studied base-site candidate.",
        ],
      }),
    ],
  },
  {
    slug: "saturn",
    name: "Saturn",
    kind: "planet",
    order: 6,
    radiusKm: 58_232,
    massKg: 5.683e26,
    semiMajorAxisAu: 9.583,
    orbitalPeriodYears: 29.457,
    rotationPeriodHours: 10.66,
    axialTiltDeg: 26.73,
    meanTemperatureC: -140,
    gravityMs2: 10.44,
    moonCount: 146,
    hasRings: true,
    atmosphere: "96% H₂, 3% He, traces of CH₄ and NH₃",
    color: "#d8c08a",
    accent: "#f3e6c4",
    ringColor: "#cbb489",
    tagline: "The ring system everyone recognises",
    summary:
      "A low-density gas giant — it would float in water — encircled by a bright ring system of water ice spanning some 280,000 km yet only tens of metres thick in places.",
    highlights: [
      "Mean density of 0.687 g/cm³, lower than water.",
      "A persistent hexagonal jet stream sits over the north pole.",
      "Hosts Titan, the only moon with a substantial atmosphere.",
    ],
    moons: [
      moon({
        slug: "titan",
        name: "Titan",
        kind: "moon",
        parent: "saturn",
        radiusKm: 2574.7,
        orbitRadiusKm: 1_221_870,
        orbitalPeriodDays: 15.945,
        massKg: 1.3452e23,
        discovery: "Christiaan Huygens, 1655",
        atmosphere: "95% N₂, 5% CH₄ — 1.45 bar at the surface",
        surface: "Hydrocarbon lakes, dunes and water-ice bedrock",
        color: "#d9a441",
        accent: "#f0cf8e",
        tagline: "The only moon with a thick atmosphere",
        summary:
          "Denser at the surface than Earth's atmosphere, with a full methane cycle of clouds, rain, rivers and polar seas.",
        highlights: [
          "Huygens landed there in 2005 — the most distant surface landing achieved.",
          "Kraken Mare is a methane–ethane sea larger than the Caspian.",
        ],
      }),
      moon({
        slug: "enceladus",
        name: "Enceladus",
        kind: "moon",
        parent: "saturn",
        radiusKm: 252.1,
        orbitRadiusKm: 237_948,
        orbitalPeriodDays: 1.37,
        massKg: 1.08e20,
        discovery: "William Herschel, 1789",
        atmosphere: "Localised water-vapour plumes",
        surface: "Fresh water ice with south-polar 'tiger stripe' fractures",
        color: "#eef4f8",
        accent: "#9fd4e8",
        tagline: "Venting an ocean into space",
        summary:
          "Cryovolcanic jets at the south pole eject water, salts and organics from a subsurface ocean, feeding Saturn's E ring.",
        highlights: [
          "Reflects over 90% of incident sunlight — the most reflective body known.",
          "Cassini flew directly through its plumes and sampled them.",
        ],
      }),
      moon({
        slug: "rhea",
        name: "Rhea",
        kind: "moon",
        parent: "saturn",
        radiusKm: 763.8,
        orbitRadiusKm: 527_108,
        orbitalPeriodDays: 4.518,
        massKg: 2.307e21,
        discovery: "Giovanni Cassini, 1672",
        surface: "Heavily cratered water ice with bright fracture cliffs",
        color: "#cdc9c2",
        accent: "#8f8d89",
        tagline: "Saturn's second-largest moon",
        summary:
          "An icy, ancient body roughly three quarters water ice by mass, with wispy fracture terrain on its trailing hemisphere.",
        highlights: [
          "Density of 1.24 g/cm³ implies an almost undifferentiated ice-rock mix.",
        ],
      }),
      moon({
        slug: "iapetus",
        name: "Iapetus",
        kind: "moon",
        parent: "saturn",
        radiusKm: 734.5,
        orbitRadiusKm: 3_560_820,
        orbitalPeriodDays: 79.32,
        massKg: 1.806e21,
        discovery: "Giovanni Cassini, 1671",
        surface: "Two-tone: dark leading hemisphere, bright trailing hemisphere",
        color: "#6f665c",
        accent: "#e7e2d8",
        tagline: "The two-faced moon",
        summary:
          "One hemisphere is as dark as coal, the other as bright as snow, and a 13-km-high equatorial ridge runs most of the way around it.",
        highlights: [
          "Brightness differs by more than a factor of ten between hemispheres.",
          "The equatorial ridge gives it a walnut-like profile.",
        ],
      }),
    ],
  },
  {
    slug: "uranus",
    name: "Uranus",
    kind: "planet",
    order: 7,
    radiusKm: 25_362,
    massKg: 8.681e25,
    semiMajorAxisAu: 19.191,
    orbitalPeriodYears: 84.011,
    rotationPeriodHours: -17.24,
    axialTiltDeg: 97.77,
    meanTemperatureC: -195,
    gravityMs2: 8.87,
    moonCount: 28,
    hasRings: true,
    atmosphere: "83% H₂, 15% He, 2.3% CH₄",
    color: "#7fd3d8",
    accent: "#c8f0f2",
    ringColor: "#6f8f96",
    tagline: "The tipped-over ice giant",
    summary:
      "An ice giant rotating on its side, giving each pole a 42-year day followed by a 42-year night, with narrow dark rings and 28 known moons named after literary characters.",
    highlights: [
      "Axial tilt of nearly 98° — likely the result of a giant impact.",
      "Coldest measured planetary atmosphere, down to about −224 °C.",
      "Visited only once, by Voyager 2 in 1986.",
    ],
    moons: [
      moon({
        slug: "titania",
        name: "Titania",
        kind: "moon",
        parent: "uranus",
        radiusKm: 788.4,
        orbitRadiusKm: 435_910,
        orbitalPeriodDays: 8.706,
        massKg: 3.4e21,
        discovery: "William Herschel, 1787",
        surface: "Ice and rock cut by enormous rift canyons",
        color: "#b9b2ab",
        accent: "#e3ded9",
        tagline: "Largest Uranian moon",
        summary:
          "Roughly half water ice, marked by canyon systems up to 1,600 km long that record ancient expansion of its interior.",
        highlights: ["Messina Chasma stretches about 1,500 km."],
      }),
      moon({
        slug: "miranda",
        name: "Miranda",
        kind: "moon",
        parent: "uranus",
        radiusKm: 235.8,
        orbitRadiusKm: 129_390,
        orbitalPeriodDays: 1.413,
        massKg: 6.4e19,
        discovery: "Gerard Kuiper, 1948",
        surface: "Chaotic patchwork of coronae and 20-km cliffs",
        color: "#a9b0b5",
        accent: "#dfe6ea",
        tagline: "The most bizarre terrain in the system",
        summary:
          "A small moon whose surface looks assembled from mismatched pieces, including Verona Rupes, the tallest known cliff.",
        highlights: ["Verona Rupes drops roughly 20 km — the tallest cliff known."],
      }),
      moon({
        slug: "ariel",
        name: "Ariel",
        kind: "moon",
        parent: "uranus",
        radiusKm: 578.9,
        orbitRadiusKm: 190_900,
        orbitalPeriodDays: 2.52,
        massKg: 1.25e21,
        discovery: "William Lassell, 1851",
        surface: "Brightest Uranian moon, with resurfaced valley floors",
        color: "#c6cbcd",
        accent: "#eef2f3",
        tagline: "The brightest of Uranus' moons",
        summary:
          "Shows the youngest surface in the Uranian system, with rift valleys apparently flooded by cryovolcanic material.",
        highlights: ["Fewest large craters of the five major Uranian moons."],
      }),
    ],
  },
  {
    slug: "neptune",
    name: "Neptune",
    kind: "planet",
    order: 8,
    radiusKm: 24_622,
    massKg: 1.024e26,
    semiMajorAxisAu: 30.07,
    orbitalPeriodYears: 164.79,
    rotationPeriodHours: 16.11,
    axialTiltDeg: 28.32,
    meanTemperatureC: -200,
    gravityMs2: 11.15,
    moonCount: 16,
    hasRings: true,
    atmosphere: "80% H₂, 19% He, 1.5% CH₄",
    color: "#3d6ee0",
    accent: "#9db8ff",
    ringColor: "#4a5f8c",
    tagline: "Winds faster than anywhere else",
    summary:
      "The outermost planet, discovered by mathematical prediction in 1846, with the fastest measured winds in the Solar System and a large retrograde moon captured from the Kuiper Belt.",
    highlights: [
      "Wind speeds reach about 2,100 km/h.",
      "Radiates about 2.6 times more energy than it receives from the Sun.",
      "One Neptunian year lasts almost 165 Earth years.",
    ],
    moons: [
      moon({
        slug: "triton",
        name: "Triton",
        kind: "moon",
        parent: "neptune",
        radiusKm: 1353.4,
        orbitRadiusKm: 354_759,
        orbitalPeriodDays: 5.877,
        massKg: 2.14e22,
        discovery: "William Lassell, 1846",
        atmosphere: "Thin N₂ with trace CH₄",
        surface: "Nitrogen ice, cantaloupe terrain and active cryogeysers",
        color: "#d5cfd8",
        accent: "#a9d7d0",
        tagline: "A captured Kuiper Belt object",
        summary:
          "The only large moon on a retrograde orbit, almost certainly captured, and one of the few geologically active bodies in the outer system.",
        highlights: [
          "Orbits backwards and is spiralling inward on a multi-billion-year timescale.",
          "Surface temperature near −235 °C, among the coldest measured.",
        ],
      }),
    ],
  },
];

export const PLANET_BY_SLUG = new Map(PLANETS.map((p) => [p.slug, p]));

export function getPlanet(slug: string): PlanetBody | undefined {
  return PLANET_BY_SLUG.get(slug.toLowerCase());
}

export function getMoon(planetSlug: string, moonSlug: string): MoonBody | undefined {
  return getPlanet(planetSlug)?.moons.find((m) => m.slug === moonSlug.toLowerCase());
}

export const ALL_MOONS: MoonBody[] = PLANETS.flatMap((p) => p.moons);

/** Shown wherever a scene compresses real distances or sizes. */
export const SCALE_DISCLOSURE =
  "Visualisation scale is compressed. Planet sizes and orbit radii are rendered on separate non-linear scales so every body stays visible in one frame — the true Solar System is overwhelmingly empty space. Numeric values on this page are published measurements and are not scaled.";

export const RENDER_DISCLOSURE =
  "Rendered procedurally from published colour, radius and rotation values. This is a schematic representation, not photography or a texture-mapped survey product.";

export function formatKm(km: number): string {
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)} million km`;
  return `${Math.round(km).toLocaleString()} km`;
}

export function formatMass(kg: number): string {
  const exp = Math.floor(Math.log10(kg));
  const mantissa = kg / 10 ** exp;
  return `${mantissa.toFixed(3)} × 10^${exp} kg`;
}

export function formatDays(days: number): string {
  if (days < 1) return `${(days * 24).toFixed(1)} hours`;
  return `${days.toLocaleString(undefined, { maximumFractionDigits: 2 })} days`;
}
