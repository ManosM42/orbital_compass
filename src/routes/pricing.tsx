import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/Chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — ORBITAL Satellite Tracking Plans" },
      {
        name: "description",
        content:
          "Explorer free tier, Pro for satellite operators, or Intelligence for deep space and API access. Monthly or yearly billing.",
      },
      { property: "og:title", content: "Pricing — ORBITAL Satellite Tracking Plans" },
      {
        property: "og:description",
        content: "From free sky-watching to full TLE and real-time telemetry analytics.",
      },
    ],
  }),
  component: Pricing,
});

const PLANS = [
  {
    id: "explorer",
    name: "Explorer",
    tagline: "Essential satellite tracking for amateur sky-watchers.",
    monthly: 0,
    yearly: 0,
    featured: false,
    badge: null,
    features: [
      "Up to 100 satellites tracked",
      "Standard pass predictions",
      "Community sightings feed",
      "Basic SGP4 orbit propagation",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Advanced telemetry and alerts for dedicated astronomy operators.",
    monthly: 15,
    yearly: 144, // €12/mo equivalent, saving 20%
    featured: true,
    badge: "Best Value",
    features: [
      "Up to 5,000 satellites tracked",
      "Real-time orbital telemetry",
      "Custom pass alerts & notifications",
      "High-precision SGP4 propagation",
      "Priority telemetry feed",
    ],
  },
  {
    id: "intelligence",
    name: "Intelligence",
    tagline: "Full institutional data feeds, raw element sets, and API access.",
    monthly: 49,
    yearly: 470, // €39/mo equivalent, saving ~20%
    featured: false,
    badge: "Mission Control",
    features: [
      "Unlimited satellite constellations",
      "Direct raw TLE & Celestrak feeds",
      "Full REST & WebSocket API access",
      "Custom constellation modeling",
      "Dedicated 24/7 telemetry support",
    ],
  },
];

const FAQ = [
  {
    q: "Where does the orbital data come from?",
    a: "This demo runs on simulated TLE-shaped data. The interfaces mirror satellite.js output, so live Celestrak or N2YO feeds drop straight in.",
  },
  {
    q: "How accurate are pass predictions?",
    a: "Predictions account for observer latitude, elevation, and lighting conditions, and are refreshed as new element sets arrive.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Plans are month-to-month, and yearly billing is refunded pro-rata within the first 30 days.",
  },
  {
    q: "Do you offer club or education discounts?",
    a: "Astronomy clubs, schools, and public observatories get Intelligence and Pro plans at 50% off. Reach out from the support channel.",
  },
];

function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow="Orbital Tiers"
        title="Pick your altitude"
        description="Start free on Explorer. Upgrade when you require real-time alerts, deep forecasts, and raw element sets."
      />

      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 backdrop-blur-md">
          {[
            { id: false, label: "Monthly Billing" },
            { id: true, label: "Yearly Billing · Save 20%" },
          ].map((o) => (
            <button
              key={o.label}
              onClick={() => setYearly(o.id)}
              className={cn(
                "rounded-full px-5 py-2 text-xs font-semibold transition-all",
                yearly === o.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PLANS.map((t) => {
          const price = yearly ? t.yearly : t.monthly;
          const monthlyEquivalent = yearly && price > 0 ? Math.round(price / 12) : price;

          return (
            <div
              key={t.id}
              className={cn(
                "panel relative flex flex-col rounded-3xl p-8 transition-transform hover:-translate-y-1",
                t.featured && "glow-ring border-primary/70 shadow-xl",
              )}
            >
              {t.badge && (
                <span className="absolute -top-3.5 left-8 inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1 text-[10px] font-bold tracking-wider text-primary-foreground uppercase shadow-md">
                  <Sparkles className="h-3 w-3" />
                  {t.badge}
                </span>
              )}

              <h2 className="font-display text-2xl font-bold text-foreground">{t.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground min-h-[40px]">{t.tagline}</p>

              <div className="mt-6 flex items-baseline gap-1.5 border-b border-border/60 pb-6">
                <span className="font-display text-5xl font-extrabold text-foreground">
                  {price === 0 ? "Free" : `€${monthlyEquivalent}`}
                </span>
                {price > 0 && (
                  <span className="text-sm font-medium text-muted-foreground">
                    /month {yearly ? <span className="text-xs text-primary block">billed €{price} yearly</span> : null}
                  </span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/tracker"
                className={cn(
                  "mt-8 rounded-full px-6 py-3.5 text-center text-sm font-semibold transition-transform hover:scale-[1.02]",
                  t.featured
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "border border-border bg-secondary/50 text-foreground hover:bg-secondary",
                )}
              >
                {price === 0 ? "Initialize Explorer" : `Activate ${t.name}`}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Feature comparison breakdown */}
      <section className="mt-24">
        <h2 className="font-display text-2xl font-bold text-foreground text-center">Comprehensive Feature Breakdown</h2>
        <div className="mt-8 panel overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="grid grid-cols-4 gap-4 border-b border-border pb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <div>Capability</div>
            <div className="text-center">Explorer</div>
            <div className="text-center text-primary font-bold">Pro</div>
            <div className="text-center">Intelligence</div>
          </div>
          <div className="divide-y divide-border/60 text-sm">
            <div className="grid grid-cols-4 gap-4 py-4 items-center">
              <span className="font-medium text-foreground">Satellite Limit</span>
              <span className="text-center text-muted-foreground">100</span>
              <span className="text-center font-bold text-primary">5,000</span>
              <span className="text-center text-muted-foreground">Unlimited</span>
            </div>
            <div className="grid grid-cols-4 gap-4 py-4 items-center">
              <span className="font-medium text-foreground">Real-time Telemetry</span>
              <span className="text-center text-muted-foreground">—</span>
              <span className="text-center text-primary font-bold">✓</span>
              <span className="text-center text-primary font-bold">✓</span>
            </div>
            <div className="grid grid-cols-4 gap-4 py-4 items-center">
              <span className="font-medium text-foreground">API Access (REST/WS)</span>
              <span className="text-center text-muted-foreground">—</span>
              <span className="text-center text-muted-foreground">—</span>
              <span className="text-center text-primary font-bold">✓ Full Access</span>
            </div>
            <div className="grid grid-cols-4 gap-4 py-4 items-center">
              <span className="font-medium text-foreground">SGP4 Propagation</span>
              <span className="text-center text-primary font-bold">Standard</span>
              <span className="text-center text-primary font-bold">High-Precision</span>
              <span className="text-center text-primary font-bold">Institutional</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="font-display text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="panel rounded-2xl p-6">
              <h3 className="font-display text-base font-semibold text-foreground">{f.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}