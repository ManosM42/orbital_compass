import { stripe } from "./stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface PortalInput {
  accessToken: string;
}

export async function createBillingPortalSessionImpl(
  data: PortalInput,
): Promise<{ url: string }> {
  const supabaseServer = createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser(data.accessToken);

  if (userError || !user) {
    throw new Error("Unauthorized: invalid or expired session.");
  }

  const { data: sub } = await supabaseServer
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    throw new Error("No billing account found. Subscribe to a plan first.");
  }

  const siteUrl = process.env["VITE_SITE_URL"] || "http://localhost:5173";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${siteUrl}/profile`,
  });

  return { url: portalSession.url };
}
