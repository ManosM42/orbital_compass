import Stripe from "stripe";
import { stripe, getStripePriceId } from "./stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface CheckoutInput {
  planId: "pro_monthly" | "pro_yearly" | "intelligence_monthly" | "intelligence_yearly";
  accessToken: string;
}

export async function createStripeCheckoutSessionImpl(
  data: CheckoutInput,
): Promise<{ url: string | null }> {
  const supabaseServer = createServerSupabaseClient();

  // Verify the access token against Supabase Auth's server — this is the
  // ONLY source of truth for who the caller is. A client can never spoof
  // this because it would need a valid signed session for another account.
  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser(data.accessToken);

  if (userError || !user) {
    throw new Error("Unauthorized: invalid or expired session.");
  }

  const priceId = getStripePriceId(data.planId);
  const siteUrl = process.env["VITE_SITE_URL"] || "http://localhost:5173";

  // Reuse an existing Stripe customer for this user if we already have one,
  // so upgrades/downgrades and receipts stay attached to a single customer.
  const { data: existingSub } = await supabaseServer
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/profile?checkout=success`,
    cancel_url: `${siteUrl}/pricing?checkout=canceled`,
    metadata: {
      userId: user.id,
      planId: data.planId,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        planId: data.planId,
      },
    },
  };

  if (existingSub?.stripe_customer_id) {
    sessionParams.customer = existingSub.stripe_customer_id;
  } else if (user.email) {
    sessionParams.customer_email = user.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return { url: session.url };
}
