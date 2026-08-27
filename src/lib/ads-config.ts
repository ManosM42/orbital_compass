/**
 * AdSense configuration is environment-driven only — never hardcode publisher
 * or slot IDs. When the client ID is absent, ads are disabled everywhere and
 * the app renders exactly as before (no script, no reserved space, no request).
 *
 * Required deployment environment variables (all client-visible, VITE_ prefixed):
 *   VITE_ADSENSE_CLIENT_ID   e.g. "ca-pub-0000000000000000"  (required to enable ads)
 *   VITE_ADSENSE_SLOT_ARTICLE   slot id used on long-form / reference pages
 *   VITE_ADSENSE_SLOT_FOOTER    slot id used above the footer on list pages
 *   VITE_ADSENSE_TEST_MODE      "true" to request test ads (optional)
 */

const raw = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export const ADSENSE_CLIENT_ID = raw(import.meta.env["VITE_ADSENSE_CLIENT_ID"]);

export const AD_SLOTS = {
  article: raw(import.meta.env["VITE_ADSENSE_SLOT_ARTICLE"]),
  footer: raw(import.meta.env["VITE_ADSENSE_SLOT_FOOTER"]),
} as const;

export type AdSlotName = keyof typeof AD_SLOTS;

export const ADSENSE_TEST_MODE = raw(import.meta.env["VITE_ADSENSE_TEST_MODE"]) === "true";

/** Ads are only ever possible when a publisher id AND the specific slot exist. */
export function adsConfigured(slot: AdSlotName): boolean {
  return Boolean(ADSENSE_CLIENT_ID && AD_SLOTS[slot]);
}

export const ADS_ENABLED = Boolean(ADSENSE_CLIENT_ID);
