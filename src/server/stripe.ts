import Stripe from "stripe";

const secretKey = process.env["STRIPE_SECRET_KEY"];
if (!secretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2026-08-26.dahlia",
});

// Trusted server-side mapping from our internal plan IDs to real Stripe Price
// IDs. The client only ever sends a planId string like "pro_monthly" — it can
// never influence which Stripe Price gets charged.
const PRICE_ID_ENV_MAP: Record<string, string> = {
  pro_monthly: "STRIPE_PRICE_PRO_MONTHLY",
  pro_yearly: "STRIPE_PRICE_PRO_YEARLY",
  intelligence_monthly: "STRIPE_PRICE_INTELLIGENCE_MONTHLY",
  intelligence_yearly: "STRIPE_PRICE_INTELLIGENCE_YEARLY",
};

export function getStripePriceId(planId: string): string {
  const envVar = PRICE_ID_ENV_MAP[planId];
  if (!envVar) {
    throw new Error(`Unknown or non-purchasable plan id: "${planId}".`);
  }
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new Error(`Missing ${envVar} environment variable.`);
  }
  return priceId;
}

// Reverse mapping used by the webhook handler to translate an incoming
// Stripe Price ID back into our internal plan_id when writing to Supabase.
export function getPlanIdFromPriceId(priceId: string): string | null {
  for (const [planId, envVar] of Object.entries(PRICE_ID_ENV_MAP)) {
    if (process.env[envVar] === priceId) return planId;
  }
  return null;
}
