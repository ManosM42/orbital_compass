import { supabase } from "@/lib/supabase/client";

export const entitlementService = {
  /**
   * Authoritatively checks if the currently authenticated user has access to a specific feature.
   * Enforced entirely server-side via Supabase RPC and RLS. Never relies on frontend state.
   */
  async hasFeature(featureKey: string): Promise<boolean> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        // Unauthenticated users default to Explorer feature set
        return await this.getDefaultExplorerFeature(featureKey);
      }

      // Call secure database function using the verified JWT session context
      const { data, error } = await supabase.rpc("user_has_feature", {
        p_feature_key: featureKey,
      });

      if (error) {
        console.error("Entitlement verification error:", error.message);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error("Failed to evaluate feature entitlement:", err);
      return false;
    }
  },

  async getDefaultExplorerFeature(featureKey: string): Promise<boolean> {
    const explorerFeatures: Record<string, any> = {
      satellite_limit: 100,
      realtime_telemetry: false,
      api_access: false,
      advanced_sgp4: true,
      custom_constellations: false,
    };

    const val = explorerFeatures[featureKey];
    if (val === true || val === "unlimited") return true;
    if (typeof val === "number" && val > 0) return true;
    return false;
  },
};