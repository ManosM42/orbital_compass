import { stripe, getStripePriceId } from "./stripe";
import { supabase } from "@/lib/supabase/client";

export async function createStripeCheckoutSession(planId: string, userId: string, userEmail?: string) {
  try {
    // 1. Resolve trusted Price ID server-side
    const priceId = getStripePriceId(planId);
    const siteUrl = process.env.VITE_SITE_URL || "http://localhost:5173";

    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: userEmail,
      client_reference_id: userId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/profile?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${siteUrl}/pricing?canceled=true`,
      metadata: {
        userId,
        planId,
      },
    });

    return { url: session.url };
  } catch (err: any) {
    throw new Error(`Stripe Checkout generation failed: ${err.message}`);
  }
}