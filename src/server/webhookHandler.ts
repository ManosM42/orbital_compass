import Stripe from "stripe";
import { stripe } from "./stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function handleStripeWebhook(rawBody: string | Buffer, signature: string): Promise<{ received: boolean }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }

  let event: Stripe.Event;

  try {
    // 1. Verify webhook signature securely
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  const supabaseServer = createServerSupabaseClient();

  // 2. Enforce idempotency: check if event has already been processed
  const { data: existingEvent } = await supabaseServer
    .from("processed_webhooks")
    .select("event_id")
    .eq("event_id", event.id)
    .single();

  if (existingEvent) {
    return { received: true }; // Already processed idempotently
  }

  // 3. Process event based on type
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId || session.client_reference_id;
      const planId = session.metadata?.planId;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (userId && planId) {
        // Fetch subscription details to get expiration period
        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        await supabaseServer.from("user_subscriptions").upsert({
          user_id: userId,
          plan_id: planId,
          status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const subscriptionId = subscription.id;
      const status = subscription.status; // 'active', 'past_due', 'canceled', etc.
      const priceId = subscription.items.data[0]?.price.id;

      // Find user subscription by Stripe customer or subscription ID
      const { data: userSub } = await supabaseServer
        .from("user_subscriptions")
        .select("user_id")
        .or(`stripe_customer_id.eq.${customerId},stripe_subscription_id.eq.${subscriptionId}`)
        .single();

      if (userSub) {
        // Map price ID back to internal plan ID if necessary
        const { data: planData } = await supabaseServer
          .from("plans")
          .select("id")
          .eq("stripe_price_id", priceId)
          .single();

        await supabaseServer.from("user_subscriptions").update({
          status: status === "active" ? "active" : status,
          ...(planData ? { plan_id: planData.id } : {}),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userSub.user_id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      // Downgrade user back to Explorer free tier upon cancellation/expiration
      const { data: userSub } = await supabaseServer
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      if (userSub) {
        await supabaseServer.from("user_subscriptions").update({
          plan_id: "explorer",
          status: "canceled",
          stripe_subscription_id: null,
          current_period_end: null,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userSub.user_id);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice.parent as any)?.subscription || (invoice as any).subscription;

      if (subscriptionId) {
        await supabaseServer.from("user_subscriptions").update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscriptionId);
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe webhook event type: ${event.type}`);
  }

  // 4. Record event ID to guarantee idempotency
  await supabaseServer.from("processed_webhooks").insert({
    event_id: event.id,
    event_type: event.type,
  });

  return { received: true };
}