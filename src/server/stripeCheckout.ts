import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { stripe, getStripePriceId } from "./stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const checkoutInputSchema = z.object({
  planId: z.enum(["pro_monthly", "pro_yearly", "intelligence_monthly", "intelligence_yearly"]),
  // The caller's current Supabase access token. We verify this server-side
  // against Supabase Auth rather than trusting any client-supplied user ID —
  // a forged/foreign user ID would fail verification and the request is rejected.
  accessToken: z.string().min(1),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: { planId: string; accessToken: string }) =>
    checkoutInputSchema.parse(input),
  )
  .handler(async ({ data }): Promise<{ url: string | null }> => {
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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existingSub?.stripe_customer_id ?? undefined,
      customer_email: existingSub?.stripe_customer_id ? undefined : (user.email ?? undefined),
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
    });

    return { url: session.url };
  });