import { createFileRoute } from "@tanstack/react-router";
import { handleStripeWebhook } from "@/server/webhookHandler";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        // Stripe signature verification requires the exact raw request body —
        // never JSON.parse it before verifying, or the signature check fails.
        const rawBody = await request.text();

        try {
          const result = await handleStripeWebhook(rawBody, signature);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (err: any) {
          console.error("Stripe webhook error:", err.message);
          return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
