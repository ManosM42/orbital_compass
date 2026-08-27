import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useConsent } from "./ConsentProvider";
import { ADS_ENABLED } from "@/lib/ads-config";
import { cn } from "@/lib/utils";

const CHOICES = [
  {
    key: "granted" as const,
    label: "Accept all",
    hint: "Allow personalised advertising",
    primary: true,
  },
  {
    key: "non-personalized" as const,
    label: "Non-personalised ads",
    hint: "Ads without profiling",
    primary: false,
  },
  { key: "denied" as const, label: "Reject", hint: "No advertising cookies", primary: false },
];

/** Sits above the mobile bottom nav; never overlays the globe canvas controls. */
export function ConsentBanner() {
  const { ready, choice, setChoice } = useConsent();
  if (!ADS_ENABLED || !ready || choice !== null) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Privacy and advertising choices"
      className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[calc(env(safe-area-inset-bottom)+4.75rem)] md:pb-4"
    >
      <div className="panel mx-auto max-w-3xl rounded-2xl p-4 sm:p-5">
        <p className="mono-label">Privacy</p>
        <p className="mt-2 text-sm text-muted-foreground">
          ORBITAL can show advertising to keep tracking free. We only load Google AdSense after you
          choose, and we never send your observer location to advertisers.{" "}
          <Link to="/privacy" className="text-foreground underline underline-offset-4">
            Privacy &amp; cookies
          </Link>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {CHOICES.map((c) => (
            <button
              key={c.key}
              onClick={() => setChoice(c.key)}
              className={cn(
                "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02]",
                c.primary
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-secondary",
              )}
            >
              {c.label}
              <span className="ml-2 hidden text-[11px] font-normal opacity-70 lg:inline">
                {c.hint}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Re-opened from the footer so the choice can always be revisited. */
export function ConsentManager() {
  const { managerOpen, closeManager, setChoice, choice } = useConsent();
  if (!managerOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage advertising choices"
        className="panel w-full max-w-md rounded-2xl p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mono-label">Advertising preferences</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Current choice:{" "}
              <span className="text-foreground">{choice ? labelFor(choice) : "not set"}</span>
            </p>
          </div>
          <button
            onClick={closeManager}
            aria-label="Close preferences"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {CHOICES.map((c) => (
            <button
              key={c.key}
              onClick={() => setChoice(c.key)}
              className="rounded-xl border border-border px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-secondary"
            >
              <span className="block font-semibold">{c.label}</span>
              <span className="block text-xs text-muted-foreground">{c.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function labelFor(choice: string) {
  return CHOICES.find((c) => c.key === choice)?.label ?? choice;
}
