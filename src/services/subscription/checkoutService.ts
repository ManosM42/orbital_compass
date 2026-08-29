import { supabase } from "@/lib/supabase/client";
import { createCheckoutSession } from "@/services/subscription/checkoutServerFn";
import { createBillingPortalSession } from "@/services/subscription/billingPortalServerFn";

export const checkoutService = {
  /**
   * Kicks off a real Stripe Checkout session for the given internal plan id
   * (e.g. "pro_monthly") and redirects the browser to it. Throws if the user
   * isn't signed in or if session creation fails.
   */
  async redirectToCheckout(planId: string): Promise<void> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("You need to be signed in to upgrade your plan.");
    }

    const result = await createCheckoutSession({
      data: {
        planId,
        accessToken: session.access_token,
      },
    });

    if (!result.url) {
      throw new Error("Stripe did not return a checkout URL. Please try again.");
    }

    window.location.href = result.url;
  },

  /**
   * Redirects to Stripe's hosted Billing Portal, where the user can cancel,
   * change plans, or update their payment method. Stripe itself is the
   * source of truth here — no custom cancel UI needed, and the webhook keeps
   * Supabase in sync automatically when they make a change.
   */
  async redirectToBillingPortal(): Promise<void> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("You need to be signed in to manage your subscription.");
    }

    const result = await createBillingPortalSession({
      data: { accessToken: session.access_token },
    });

    window.location.href = result.url;
  },
};
