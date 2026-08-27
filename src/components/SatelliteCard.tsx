import { Star, Gauge, ArrowUp, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/services/satellite/satelliteCatalog";
import { orbitalPeriodMin } from "@/services/satellite/satellitePropagation";
import type { GeoPosition, Satellite } from "@/services/satellite/satelliteTypes";

export function CategoryBadge({ category }: { category: Satellite["category"] }) {
  const tone =
    category === "space-station"
      ? "text-ember border-ember/40 bg-ember/10"
      : category === "starlink"
        ? "text-primary border-primary/40 bg-primary/10"
        : category === "navigation"
          ? "text-plasma border-plasma/40 bg-plasma/10"
          : "text-signal border-signal/40 bg-signal/10";
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase", tone)}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

interface Props {
  satellite: Satellite;
  /** live propagated position, when available */
  position?: GeoPosition | undefined;
  selected?: boolean;
  favorite?: boolean;
  onSelect?: () => void;
  onToggleFavorite?: () => void;
}

export function SatelliteCard({
  satellite,
  position,
  selected,
  favorite,
  onSelect,
  onToggleFavorite,
}: Props) {
  const period = orbitalPeriodMin(satellite);

  return (
    <article
      onClick={onSelect}
      className={cn(
        "panel group cursor-pointer rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50",
        selected && "border-primary/70 glow-ring",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-foreground">
            {satellite.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {satellite.operator} · NORAD {satellite.noradId}
          </p>
        </div>
        <button
          aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.();
          }}
          className={cn(
            "shrink-0 rounded-full border border-border p-1.5 transition-colors",
            favorite ? "border-ember/60 bg-ember/15 text-ember" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Star className={cn("h-3.5 w-3.5", favorite && "fill-current")} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CategoryBadge category={satellite.category} />
        <span className="mono-label">{satellite.country}</span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric
          icon={<ArrowUp className="h-3 w-3" />}
          label="Alt"
          value={position ? `${Math.round(position.altitudeKm)} km` : "—"}
        />
        <Metric
          icon={<Gauge className="h-3 w-3" />}
          label="Vel"
          value={position ? `${position.velocityKmS.toFixed(2)} km/s` : "—"}
        />
        <Metric
          icon={<Timer className="h-3 w-3" />}
          label="Period"
          value={period ? `${period.toFixed(0)} m` : "—"}
        />
      </dl>
    </article>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-2 py-2">
      <dt className="flex items-center justify-center gap-1 text-[10px] tracking-widest text-muted-foreground uppercase">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-mono text-xs text-foreground">{value}</dd>
    </div>
  );
}
