/** Static, factual site content (no orbital state lives here). */

export interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  featured?: boolean;
  features: string[];
}

export const PRICING: PricingTier[] = [
  {
    id: "observer",
    name: "Observer",
    tagline: "For the curious sky-watcher",
    monthly: 0,
    yearly: 0,
    features: [
      "Track up to 10 satellites",
      "3-day pass predictions",
      "Live ISS position",
      "Interactive globe",
      "Community sky reports",
    ],
  },
  {
    id: "navigator",
    name: "Navigator",
    tagline: "Serious tracking, every night",
    monthly: 9,
    yearly: 86,
    featured: true,
    features: [
      "Unlimited satellite tracking",
      "14-day pass predictions",
      "Starlink train alerts",
      "Push + email notifications",
      "Favourites & custom lists",
      "Ground-track export (KML)",
    ],
  },
  {
    id: "mission",
    name: "Mission Control",
    tagline: "For teams, clubs and observatories",
    monthly: 39,
    yearly: 374,
    features: [
      "Everything in Navigator",
      "Full TLE + API access",
      "Multi-station observer network",
      "Conjunction & decay warnings",
      "Priority propagation compute",
      "Dedicated support channel",
    ],
  },
];

/** Published ISS design facts (structural, not telemetry). */
export const ISS_FACTS = [
  { label: "Orbits per day", value: "~15.5" },
  { label: "Pressurised volume", value: "916 m³" },
  { label: "Mass", value: "419,725 kg" },
  { label: "Solar array span", value: "73 m" },
  { label: "Crewed since", value: "Nov 2000" },
  { label: "First module", value: "Zarya, 1998" },
];
