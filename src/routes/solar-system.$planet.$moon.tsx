import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { BodyClassBadge, Crumbs, Fact, FactGrid, Note } from "@/components/solar/BodyUI";
import { SolarViz } from "@/components/solar/SolarViz";
import {
  RENDER_DISCLOSURE,
  formatDays,
  formatKm,
  formatMass,
  getMoon,
  getPlanet,
} from "@/services/solar/solarSystemData";

export const Route = createFileRoute("/solar-system/$planet/$moon")({
  loader: ({ params }) => {
    const moon = getMoon(params.planet, params.moon);
    if (!moon) throw notFound();
    return { planet: params.planet.toLowerCase(), moon: moon.slug };
  },
  head: ({ params }) => {
    const moon = getMoon(params.planet, params.moon);
    const planet = getPlanet(params.planet);
    if (!moon || !planet) {
      return {
        meta: [{ title: "Moon not found — ORBITAL" }, { name: "robots", content: "noindex" }],
      };
    }
    const description = `${moon.name}, a natural satellite of ${planet.name}: ${moon.tagline}. Radius, orbital period, surface and discovery facts with an interactive 3D view.`;
    return {
      meta: [
        { title: `${moon.name} — Moon of ${planet.name} — ORBITAL` },
        { name: "description", content: description },
        { property: "og:title", content: `${moon.name} — Moon of ${planet.name}` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: MoonNotFound,
  component: MoonPage,
});

function MoonNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Unknown moon</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This moon is not profiled in ORBITAL's reference set.
      </p>
      <Link
        to="/solar-system"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the Solar System
      </Link>
    </div>
  );
}

function MoonPage() {
  const params = Route.useLoaderData();
  const planet = getPlanet(params.planet)!;
  const moon = getMoon(params.planet, params.moon)!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Crumbs
        items={[
          { label: "Solar System", to: "/solar-system" },
          { label: planet.name, to: "/solar-system/$planet", params: { planet: planet.slug } },
          { label: moon.name },
        ]}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <BodyClassBadge kind="natural" />
        <span className="mono-label">Natural satellite of {planet.name}</span>
      </div>

      <h1 className="mt-4 text-4xl font-bold text-foreground sm:text-5xl">{moon.name}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{moon.summary}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <SolarViz
          mode="moon"
          moon={moon}
          planet={planet}
          className="aspect-square w-full sm:aspect-[4/3] lg:aspect-auto lg:h-[500px]"
          caption={`${RENDER_DISCLOSURE} ${planet.name} appears as a backdrop at schematic distance, not to scale.`}
        />

        <div className="space-y-3">
          <div className="panel rounded-2xl p-5">
            <p className="mono-label">Surface</p>
            <p className="mt-2 text-sm text-foreground">{moon.surface}</p>
          </div>
          <div className="panel rounded-2xl p-5">
            <p className="mono-label">Atmosphere</p>
            <p className="mt-2 text-sm text-foreground">
              {moon.atmosphere ?? "No significant atmosphere reported"}
            </p>
          </div>
          <div className="panel rounded-2xl p-5">
            <p className="mono-label">Notable</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {moon.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-plasma" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl font-bold text-foreground">Measured properties</h2>
      <div className="mt-4">
        <FactGrid>
          <Fact label="Mean radius" value={formatKm(moon.radiusKm)} />
          <Fact label="Mass" value={moon.massKg ? formatMass(moon.massKg) : undefined} />
          <Fact label="Orbit radius" value={formatKm(moon.orbitRadiusKm)} />
          <Fact label="Orbital period" value={formatDays(moon.orbitalPeriodDays)} />
          <Fact label="Discovery" value={moon.discovery} />
          <Fact label="Parent planet" value={planet.name} />
        </FactGrid>
      </div>

      <Note>
        These are published reference values for a natural body — they are not measured live and
        no ephemeris is computed. Live, continuously calculated positions in ORBITAL exist only for
        artificial satellites in Earth orbit.
      </Note>

      <Link
        to="/solar-system/$planet"
        params={{ planet: planet.slug }}
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {planet.name}
      </Link>
    </div>
  );
}
