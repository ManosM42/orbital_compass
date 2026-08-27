import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/Chrome";
import { BodyClassBadge, Note } from "@/components/solar/BodyUI";
import { AdSlot } from "@/components/ads/AdSlot";
import { SolarViz } from "@/components/solar/SolarViz";
import {
  PLANETS,
  RENDER_DISCLOSURE,
  SCALE_DISCLOSURE,
  SUN,
  formatKm,
} from "@/services/solar/solarSystemData";

export const Route = createFileRoute("/solar-system/")({
  head: () => ({
    meta: [
      { title: "Solar System Explorer — ORBITAL" },
      {
        name: "description",
        content:
          "Explore all eight planets and their major moons in an interactive 3D solar system, with published radii, masses, orbital periods and atmospheres alongside ORBITAL's live satellite tracking.",
      },
      { property: "og:title", content: "Solar System Explorer — ORBITAL" },
      {
        property: "og:description",
        content: "An interactive 3D tour of the planets and major moons, with published science data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SolarSystemOverview,
});

function SolarSystemOverview() {
  const [focus, setFocus] = useState<string | null>(null);
  const focused = PLANETS.find((p) => p.slug === focus) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Explore"
        title="The Solar System"
        description="Eight planets, one star and the major moons worth knowing — rendered as a navigable scene and backed by published measurements."
      />

      <div className="mt-6">
        <BodyClassBadge kind="natural" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SolarViz
          mode="system"
          focus={focus}
          onSelectPlanet={setFocus}
          className="aspect-square w-full sm:aspect-[4/3] lg:aspect-auto lg:h-[560px]"
          caption={SCALE_DISCLOSURE}
        />

        <div className="panel rounded-3xl p-6">
          {focused ? (
            <>
              <p className="mono-label">Selected</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
                {focused.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{focused.tagline}</p>
              <p className="mt-4 text-sm text-muted-foreground">{focused.summary}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <dt className="mono-label">Mean radius</dt>
                  <dd className="mt-1 text-foreground">{formatKm(focused.radiusKm)}</dd>
                </div>
                <div>
                  <dt className="mono-label">Orbital period</dt>
                  <dd className="mt-1 text-foreground">{focused.orbitalPeriodYears} yr</dd>
                </div>
                <div>
                  <dt className="mono-label">Distance</dt>
                  <dd className="mt-1 text-foreground">{focused.semiMajorAxisAu} AU</dd>
                </div>
                <div>
                  <dt className="mono-label">Known moons</dt>
                  <dd className="mt-1 text-foreground">{focused.moonCount}</dd>
                </div>
              </dl>
              <Link
                to="/solar-system/$planet"
                params={{ planet: focused.slug }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
              >
                Open {focused.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <p className="mono-label">Central star</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">{SUN.name}</h2>
              <p className="mt-4 text-sm text-muted-foreground">{SUN.summary}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <dt className="mono-label">Radius</dt>
                  <dd className="mt-1 text-foreground">{formatKm(SUN.radiusKm)}</dd>
                </div>
                <div>
                  <dt className="mono-label">Photosphere</dt>
                  <dd className="mt-1 text-foreground">{SUN.surfaceTemperatureK} K</dd>
                </div>
              </dl>
              <p className="mt-6 text-xs text-muted-foreground">
                Click any planet in the scene, or pick one below.
              </p>
            </>
          )}
        </div>
      </div>

      <h2 className="mt-12 font-display text-xl font-bold text-foreground">All eight planets</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANETS.map((p) => (
          <Link
            key={p.slug}
            to="/solar-system/$planet"
            params={{ planet: p.slug }}
            onMouseEnter={() => setFocus(p.slug)}
            className="panel group rounded-2xl p-5 transition-colors hover:border-primary/60"
          >
            <span
              className="block h-10 w-10 rounded-full"
              style={{ background: `radial-gradient(circle at 32% 30%, ${p.accent}, ${p.color})` }}
            />
            <p className="mono-label mt-4">{`0${p.order}`} · {p.semiMajorAxisAu} AU</p>
            <p className="mt-1 font-display text-lg font-semibold text-foreground">{p.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
            <p className="mt-3 text-[11px] text-muted-foreground/80">
              {p.moonCount} known moons · {p.moons.length} profiled here
            </p>
          </Link>
        ))}
      </div>

      <AdSlot slot="article" className="mt-12" />

      <Note>
        {RENDER_DISCLOSURE} Planet and moon figures are published reference values, not live
        measurements — ORBITAL only computes real-time state for artificial satellites, using
        published element sets and local SGP4 propagation.
      </Note>
    </div>
  );
}
