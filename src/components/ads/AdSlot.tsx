import { useEffect, useRef, useState } from "react";
import { useConsent } from "@/components/consent/ConsentProvider";
import {
  ADSENSE_CLIENT_ID,
  ADSENSE_TEST_MODE,
  AD_SLOTS,
  adsConfigured,
  type AdSlotName,
} from "@/lib/ads-config";
import { cn } from "@/lib/utils";

let scriptPromise: Promise<void> | null = null;

/** Loads the AdSense library once, and only after consent has been granted. */
function loadAdSense(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (!ADSENSE_CLIENT_ID) return reject(new Error("no client id"));
    const s = document.createElement("script");
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
      ADSENSE_CLIENT_ID,
    )}`;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("adsense script blocked"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface AdSlotProps {
  slot: AdSlotName;
  className?: string;
  /** Reserved height keeps layout stable before/while the ad loads. */
  minHeight?: number;
}

/**
 * Responsive, lazily-requested AdSense unit.
 * - renders nothing unless env config exists AND consent allows ads
 * - hidden below `md` (no safe non-intrusive mobile placement in this layout)
 * - only requests when scrolled near the viewport (IntersectionObserver)
 * - reserves fixed height so no cumulative layout shift occurs
 */
export function AdSlot({ slot, className, minHeight = 280 }: AdSlotProps) {
  const { adsAllowed, nonPersonalized } = useConsent();
  const hostRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);

  const configured = adsConfigured(slot);

  useEffect(() => {
    if (!configured || !adsAllowed || near) return;
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [configured, adsAllowed, near]);

  useEffect(() => {
    if (!near || pushed.current || !adsAllowed || !configured) return;
    pushed.current = true;
    let cancelled = false;
    loadAdSense()
      .then(() => {
        if (cancelled || !insRef.current) return;
        const w = window as unknown as {
          adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
        };
        w.adsbygoogle = w.adsbygoogle ?? [];
        if (nonPersonalized) w.adsbygoogle.requestNonPersonalizedAds = 1;
        w.adsbygoogle.push({});
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [near, adsAllowed, configured, nonPersonalized]);

  if (!configured || !adsAllowed || failed) return null;

  return (
    <aside
      ref={hostRef}
      aria-label="Advertisement"
      className={cn("mx-auto hidden w-full max-w-3xl md:block", className)}
    >
      <p className="mono-label mb-2 text-center opacity-70">Advertisement</p>
      <div
        className="panel overflow-hidden rounded-2xl p-2"
        style={{ minHeight: `${minHeight}px` }}
      >
        <ins
          ref={insRef}
          className="adsbygoogle block"
          style={{ display: "block", minHeight: `${minHeight - 16}px` }}
          data-ad-client={ADSENSE_CLIENT_ID ?? undefined}
          data-ad-slot={AD_SLOTS[slot] ?? undefined}
          data-ad-format="auto"
          data-full-width-responsive="true"
          {...(ADSENSE_TEST_MODE ? { "data-adtest": "on" } : {})}
        />
      </div>
    </aside>
  );
}
