import { supabase } from "@/lib/supabase/client";

export interface Plan {
  id: string;
  name: string;
  tier: "explorer" | "pro" | "intelligence";
  interval: "none" | "month" | "year";
  stripe_price_id: string | null;
  price_cents: number;
  features: Record<string, any>;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan?: Plan;
}

export const subscriptionService = {
  async getPlans(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("price_cents", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getUserSubscription(): Promise<UserSubscription | null> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*, plan:plans(*)")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    return data || {
      id: "fallback",
      user_id: session.user.id,
      plan_id: "explorer",
      status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_end: null,
      cancel_at_period_end: false,
      plan: {
        id: "explorer",
        name: "Explorer",
        tier: "explorer",
        interval: "none",
        stripe_price_id: null,
        price_cents: 0,
        features: { satellite_limit: 100, realtime_telemetry: false, api_access: false },
      },
    };
  },
};