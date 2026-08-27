import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ADS_ENABLED } from "@/lib/ads-config";

export type ConsentChoice = "granted" | "denied" | "non-personalized";

export interface ConsentState {
  /** null = undecided (no ad request may be made yet). */
  choice: ConsentChoice | null;
  decidedAt: string | null;
}

interface ConsentContextValue extends ConsentState {
  ready: boolean;
  /** True only when Google ad requests are allowed at all. */
  adsAllowed: boolean;
  /** True when ads must be requested with npa=1. */
  nonPersonalized: boolean;
  setChoice: (choice: ConsentChoice) => void;
  openManager: () => void;
  closeManager: () => void;
  managerOpen: boolean;
}

const STORAGE_KEY = "orbital.consent.v1";

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStored(): ConsentState {
  if (typeof window === "undefined") return { choice: null, decidedAt: null };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (
      parsed &&
      (parsed.choice === "granted" ||
        parsed.choice === "denied" ||
        parsed.choice === "non-personalized")
    ) {
      return { choice: parsed.choice, decidedAt: parsed.decidedAt ?? null };
    }
  } catch {
    /* corrupt value — treat as undecided */
  }
  return { choice: null, decidedAt: null };
}

type ConsentSignal = "granted" | "denied";

/**
 * Google Consent Mode v2 defaults. Pushed before any AdSense script loads so
 * the tag never runs with implied consent.
 */
function pushConsent(mode: "default" | "update", ad: ConsentSignal, personalized: ConsentSignal) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push([
    "consent",
    mode,
    {
      ad_storage: ad,
      ad_user_data: personalized,
      ad_personalization: personalized,
      analytics_storage: "denied",
      wait_for_update: 500,
    },
  ]);
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConsentState>({ choice: null, decidedAt: null });
  const [ready, setReady] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  useEffect(() => {
    pushConsent("default", "denied", "denied");
    setState(readStored());
    setReady(true);
  }, []);

  const setChoice = useCallback((choice: ConsentChoice) => {
    const next = { choice, decidedAt: new Date().toISOString() };
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked — choice applies for this session only */
    }
    pushConsent(
      "update",
      choice === "denied" ? "denied" : "granted",
      choice === "granted" ? "granted" : "denied",
    );
    setManagerOpen(false);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      ...state,
      ready,
      adsAllowed: ADS_ENABLED && (state.choice === "granted" || state.choice === "non-personalized"),
      nonPersonalized: state.choice === "non-personalized",
      setChoice,
      managerOpen,
      openManager: () => setManagerOpen(true),
      closeManager: () => setManagerOpen(false),
    }),
    [state, ready, setChoice, managerOpen],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used inside <ConsentProvider>");
  return ctx;
}
