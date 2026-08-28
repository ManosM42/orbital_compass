export async function startStripeCheckout(priceId: string) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!priceId || priceId.startsWith("prod_")) {
      alert("Error: Invalid Price ID. Make sure your .env has test price IDs starting with price_");
      return;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ priceId }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(`Stripe Error: ${data.message || "Could not start checkout"}`);
      return;
    }

    // Direct redirect to Stripe Checkout!
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    }
  } catch (err: any) {
    console.error("Checkout launch error:", err);
    alert("Network error starting checkout.");
  }
}