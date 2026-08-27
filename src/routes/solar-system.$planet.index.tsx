import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { BodyClassBadge, Crumbs, Fact, FactGrid, Note } from "@/components/solar/BodyUI";
import { AdSlot } from "@/components/ads/AdSlot";
import { SolarViz } from "@/components/solar/SolarViz";
import {
  PLANETS,
  RENDER_DISCLOSURE,
  SCALE_DISCLOSURE,
  formatDays,
  formatKm,
  formatMass,
  getPlanet,
} from "@/services/solar/solarSystemData";

export const Route = createFileRoute("/solar-system/$planet/")({
  loader: ({ params }) => {
    const planet = getPlanet(params.planet);
    if (!planet) throw notFound();
    return { slug: planet.slug };
  },
  head: ({ params }) => {
    const planet = getPlanet(params.planet);
    if (!planet) {
      return {
        meta: [
          { title: "Planet not found — ORBITAL" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const description = `${planet.name}: ${planet.tagline}. Published radius, mass, orbital period, atmosphere and major moons, with an interactive 3D view.`;
    return {
      meta: [
        { title: `${planet.name} — Solar System — ORBITAL` },
        { name: "description", content: description },
        { property: "og:title", content: `${planet.name} — Solar System — ORBITAL` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: PlanetNotFound,
  component: PlanetPage,
});

function PlanetNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Unknown planet</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        ORBITAL profiles the eight planets of the Solar System.
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

function PlanetPage() {
  const { slug } = Route.useLoaderData();
  const planet = getPlanet(slug)!;
  const index = PLANETS.findIndex((p) => p.slug === planet.slug);
  const prev = PLANETS[(index - 1 + PLANETS.length) % PLANETS.length]!;
  const next = PLANETS[(index + 1) % PLANETS.length]!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Crumbs
        items={[
          { label: "Explore", to: "/solar-system" },
          { label: "Solar System", to: "/solar-system" },
          { label: planet.name },
        ]}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <BodyClassBadge kind="natural" />
        <span className="mono-label">Planet {planet.order} of 8</span>
      </div>

      <h1 className="mt-4 text-4xl font-bold text-foreground sm:text-5xl">{planet.name}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{planet.summary}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <SolarViz
          mode="planet"
          planet={planet}
          className="aspect-square w-full sm:aspect-[4/3] lg:aspect-auto lg:h-[520px]"
          caption={`${RENDER_DISCLOSURE} ${planet.moons.length > 0 ? "Moon orbits are schematic spacing, not scaled distances or ephemeris positions." : ""}`}
        />

        <div className="space-y-3">
          <div className="panel rounded-2xl p-5">
            <p className="mono-label">Atmosphere</p>
            <p className="mt-2 text-sm text-foreground">{planet.atmosphere}</p>
          </div>
          <div className="panel rounded-2xl p-5">
            <p className="mono-label">Notable</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {planet.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          {planet.slug === "earth" && (
            <Link
              to="/tracker"
              className="panel flex items-center justify-between rounded-2xl p-5 transition-colors hover:border-primary/60"
            >
              <span>
                <span className="mono-label block">Artificial satellites</span>
                <span className="mt-1 block text-sm text-foreground">
                  Track Earth's orbital traffic live
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
          )}
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl font-bold text-foreground">Measured properties</h2>
      <div className="mt-4">
        <FactGrid>
          <Fact label="Mean radius" value={formatKm(planet.radiusKm)} />
          <Fact label="Mass" value={formatMass(planet.massKg)} />
          <Fact label="Surface gravity" value={`${planet.gravityMs2} m/s²`} />
          <Fact label="Mean temperature" value={`${planet.meanTemperatureC} °C`} />
          <Fact label="Distance from Sun" value={`${planet.semiMajorAxisAu} AU`} />
          <Fact label="Orbital period" value={`${planet.orbitalPeriodYears} Earth years`} />
          <Fact
            label="Rotation period"
            value={`${Math.abs(planet.rotationPeriodHours)} h${planet.rotationPeriodHours < 0 ? " (retrograde)" : ""}`}
          />
          <Fact label="Axial tilt" value={`${planet.axialTiltDeg}°`} />
          <Fact label="Known moons" value={String(planet.moonCount)} />
          <Fact label="Ring system" value={planet.hasRings ? "Yes" : "None known"} />
        </FactGrid>
      </div>

      <h2 className="mt-10 font-display text-xl font-bold text-foreground">
        Major moons {planet.moons.length > 0 ? `(${planet.moons.length} profiled)` : ""}
      </h2>
      {planet.moons.length === 0 ? (
        <p className="panel mt-4 rounded-2xl p-8 text-center text-sm text-muted-foreground">
          {planet.name} has no known natural satellites.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planet.moons.map((m) => (
            <Link
              key={m.slug}
              to="/solar-system/$planet/$moon"
              params={{ planet: planet.slug, moon: m.slug }}
              className="panel rounded-2xl p-5 transition-colors hover:border-primary/60"
            >
              <span
                className="block h-8 w-8 rounded-full"
                style={{ background: `radial-gradient(circle at 32% 30%, ${m.accent}, ${m.color})` }}
              />
              <p className="mt-4 font-display text-lg font-semibold text-foreground">{m.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.tagline}</p>
              <p className="mono-label mt-3 text-[10px]">
                r {Math.round(m.radiusKm).toLocaleString()} km · period {formatDays(m.orbitalPeriodDays)}
              </p>
            </Link>
          ))}
        </div>
      )}

      <Note>{SCALE_DISCLOSURE}</Note>

      <AdSlot slot="article" className="mt-10" />


      <div className="mt-8 flex flex-wrap justify-between gap-3">
        <Link
          to="/solar-system/$planet"
          params={{ planet: prev.slug }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> {prev.name}
        </Link>
        <Link
          to="/solar-system/$planet"
          params={{ planet: next.slug }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
        >
          {next.name} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
