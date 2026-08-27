/**
 * Shared presentation pieces for natural-body pages.
 * Kept renderer-independent so the solar routes never duplicate layout code.
 */

import { Link } from "@tanstack/react-router";
import { Info, Moon as MoonIcon, Satellite } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Fact({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="panel rounded-2xl p-4">
      <p className="mono-label">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-lg font-semibold",
          value ? "text-foreground" : "text-muted-foreground/70",
        )}
      >
        {value ?? "Data unavailable"}
      </p>
    </div>
  );
}

export function FactGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-2xl border border-border/60 bg-secondary/30 p-4 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Natural vs artificial distinction — shown on every natural-body page so a
 * reader is never left guessing whether the numbers are live.
 */
export function BodyClassBadge({ kind }: { kind: "natural" | "artificial" }) {
  const natural = kind === "natural";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase",
        natural
          ? "border-plasma/40 bg-plasma/10 text-plasma"
          : "border-primary/40 bg-primary/10 text-primary",
      )}
    >
      {natural ? <MoonIcon className="h-3 w-3" /> : <Satellite className="h-3 w-3" />}
      {natural ? "Natural body · static reference data" : "Artificial object · live SGP4"}
    </span>
  );
}

export function Crumbs({ items }: { items: { label: string; to?: string; params?: Record<string, string> }[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="opacity-40">/</span>}
          {item.to ? (
            <Link
              to={item.to}
              params={item.params as never}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
