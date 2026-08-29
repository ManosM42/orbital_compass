/**
 * Client-safe wrapper around the server-only Stripe checkout logic — mirrors
 * the pattern used by services/satellite/satelliteApi.ts. This file itself
 * has no static import of anything under src/server/, so it's safe to import
 * from client code (e.g. checkoutService.ts). The actual Stripe/service-role
 * logic is dynamically imported only inside the handler, which runs
 * server-side, so it never reaches the client bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const checkoutInputSchema = z.object({
  planId: z.enum(["pro_monthly", "pro_yearly", "intelligence_monthly", "intelligence_yearly"]),
  // The caller's current Supabase access token, verified server-side against
  // Supabase Auth rather than trusting any client-supplied user ID.
  accessToken: z.string().min(1),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: { planId: string; accessToken: string }) =>
    checkoutInputSchema.parse(input),
  )
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const { createStripeCheckoutSessionImpl } = await import(
      "@/server/stripeCheckoutImpl.server"
    );
    return createStripeCheckoutSessionImpl(data);
  });
