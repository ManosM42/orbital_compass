import { Link } from "@tanstack/react-router";
import {
  Globe2,
  Radar,
  ArrowUpFromDot,
  CalendarClock,
  Satellite as SatIcon,
  Orbit,
  Gem,
  Menu,
  X,
  ChevronDown,
  Sun,
  Activity,
  Camera,
  Target,
  Trophy,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { ReplayIntroButton } from "@/components/BootSequence";
import { useConsent } from "@/components/consent/ConsentProvider";
import { ADS_ENABLED } from "@/lib/ads-config";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.jpg";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Every destination stays reachable — grouping only changes how they're shown. */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: Globe2 },
  { to: "/tracker", label: "Tracker", icon: Radar },
  { to: "/above-me", label: "Above Me", icon: ArrowUpFromDot },
  { to: "/passes", label: "Passes", icon: CalendarClock },
  { to: "/live", label: "Live", icon: Activity },
  { to: "/solar-system", label: "Solar System", icon: Sun },
  { to: "/starlink", label: "Starlink", icon: SatIcon },
  { to: "/iss", label: "ISS", icon: Orbit },
  { to: "/camera", label: "Space Camera", icon: Camera },
  { to: "/missions", label: "Mission Control", icon: Target },
  { to: "/community", label: "Leaderboard", icon: Trophy },
  { to: "/pricing", label: "Pricing", icon: Gem },
];

const GROUPS: NavGroup[] = [
  {
    label: "Track",
    items: [
      { to: "/tracker", label: "Tracker", icon: Radar, description: "Live globe and catalog search" },
      {
        to: "/above-me",
        label: "Above Me",
        icon: ArrowUpFromDot,
        description: "Everything over your horizon",
      },
      {
        to: "/passes",
        label: "Passes",
        icon: CalendarClock,
        description: "Calculated passes for your sky",
      },
      {
        to: "/camera",
        label: "Space Camera",
        icon: Camera,
        description: "Optical telemetry capture & verification",
      },
    ],
  },
  {
    label: "Explore",
    items: [
      {
        to: "/solar-system",
        label: "Solar System",
        icon: Sun,
        description: "Planets and major moons",
      },
      { to: "/starlink", label: "Starlink", icon: SatIcon, description: "Shells and trains" },
      { to: "/iss", label: "ISS", icon: Orbit, description: "Station telemetry and crew" },
    ],
  },
  {
    label: "Missions",
    items: [
      {
        to: "/missions",
        label: "Mission Control",
        icon: Target,
        description: "Orbital telemetry challenges & XP",
      },
      {
        to: "/community",
        label: "Leaderboard",
        icon: Trophy,
        description: "Global commander rankings",
      },
    ],
  },
];

const FLAT_LINKS: NavItem[] = [
  { to: "/live", label: "Live", icon: Activity },
  { to: "/pricing", label: "Pricing", icon: Gem },
];

const MOBILE_ITEMS = NAV_ITEMS.filter((i) =>
  ["/", "/tracker", "/above-me", "/camera", "/missions"].includes(i.to),
);

function GroupMenu({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {group.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full w-64 pt-2">
          <div className="panel overflow-hidden rounded-2xl p-1.5">
            {group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:text-foreground"
              >
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-foreground">{item.label}</span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground">{item.description}</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src={logoImage}
            alt="ORBITAL Logo"
            className="h-11 w-11 rounded-xl object-cover shadow-md transition-transform group-hover:scale-105"
          />
          <span className="font-display text-lg font-bold tracking-[0.24em] text-foreground">
            ORBITAL
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
          >
            Home
          </Link>
          {GROUPS.map((g) => (
            <GroupMenu key={g.label} group={g} />
          ))}
          {FLAT_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/pricing"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] sm:inline-flex"
          >
            Start tracking
          </Link>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Normal Mobile Hamburger Dropdown Navbar */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 border-b border-border/60 bg-background/95 px-6 py-4 shadow-2xl backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-1.5 max-h-[75vh] overflow-y-auto">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary data-[status=active]:bg-secondary data-[status=active]:text-primary"
            >
              <Globe2 className="h-4 w-4 text-primary" />
              <span>Home</span>
            </Link>

            {NAV_ITEMS.filter((item) => item.to !== "/").map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary data-[status=active]:bg-secondary data-[status=active]:text-primary"
              >
                <item.icon className="h-4 w-4 text-primary" />
                <span>{item.label}</span>
              </Link>
            ))}

            <div className="mt-3 pt-3 border-t border-border/60">
              <Link
                to="/pricing"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02]"
              >
                Start tracking
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="grid grid-cols-5">
        {MOBILE_ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="group flex flex-col items-center gap-1 py-2.5 text-muted-foreground data-[status=active]:text-primary"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PrivacyPrefsButton() {
  const { openManager } = useConsent();
  if (!ADS_ENABLED) return null;
  return (
    <button onClick={openManager} className="mr-3 underline underline-offset-4">
      Ad preferences
    </button>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs tracking-[0.2em] uppercase">
          ORBITAL · real orbital element sets
        </p>
        <p className="text-xs">
          <ReplayIntroButton className="mr-3 underline underline-offset-4" />
          <Link to="/privacy" className="mr-3 underline underline-offset-4">
            Privacy &amp; cookies
          </Link>
          <PrivacyPrefsButton />
          Positions are propagated locally with SGP4 from publicly published element sets (CelesTrak). Not for operational use.
        </p>
      </div>
    </footer>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("animate-rise", className)}>
      <p className="mono-label">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel rounded-2xl p-4">
      <p className="mono-label">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}