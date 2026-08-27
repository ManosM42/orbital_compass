import { AlertTriangle, CloudOff, Loader2, RefreshCw, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAge } from "@/services/satellite/satelliteCache";
import type { DataSourceInfo, DataStatus } from "@/services/satellite/satelliteTypes";

const TONE: Record<DataStatus, string> = {
  loading: "border-border text-muted-foreground",
  live: "border-signal/50 bg-signal/10 text-signal",
  stale: "border-ember/50 bg-ember/10 text-ember",
  offline: "border-ember/50 bg-ember/10 text-ember",
  error: "border-destructive/50 bg-destructive/10 text-destructive",
};

const LABEL: Record<DataStatus, string> = {
  loading: "Fetching element sets",
  live: "Live element sets",
  stale: "Stale element sets",
  offline: "Offline — cached elements",
  error: "Data unavailable",
};

interface Props {
  status: DataStatus;
  source?: DataSourceInfo | undefined;
  fetchedAt?: string | undefined;
  error?: string | undefined;
  isFetching?: boolean;
  onRefresh?: () => void;
  className?: string;
}

/** Honest freshness indicator — the app never renders positions as live when they are not. */
export function DataStatusBadge({
  status,
  source,
  fetchedAt,
  error,
  isFetching,
  onRefresh,
  className,
}: Props) {
  const Icon =
    status === "loading" ? Loader2 : status === "offline" ? CloudOff : status === "error" ? AlertTriangle : Radio;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
          TONE[status],
        )}
      >
        <Icon className={cn("h-3 w-3", status === "loading" && "animate-spin")} />
        {LABEL[status]}
        {fetchedAt && <span className="font-mono opacity-80">· {formatAge(fetchedAt)}</span>}
      </span>
      {source && (
        <span className="font-mono text-[11px] text-muted-foreground">
          via {source.providerLabel}
          {source.cached ? " (cache)" : ""}
        </span>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
          Refresh
        </button>
      )}
      {error && status !== "live" && (
        <span className="text-[11px] text-destructive">{error}</span>
      )}
    </div>
  );
}

/** Full-width panel shown when there is nothing at all to display. */
export function DataErrorPanel({ error, onRetry }: { error?: string | undefined; onRetry?: (() => void) | undefined }) {
  return (
    <div className="panel rounded-2xl p-10 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
      <p className="mt-4 font-display text-lg font-semibold text-foreground">
        Orbital data is unavailable
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {error ?? "No element sets could be retrieved from the upstream provider."} Nothing is shown
        rather than guessing positions.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingPanel({ label = "Retrieving element sets…" }: { label?: string }) {
  return (
    <div className="panel flex items-center justify-center gap-3 rounded-2xl p-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}
