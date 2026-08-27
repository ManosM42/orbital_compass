import { supabase } from "@/lib/supabase/client";

export interface RewardDefinition {
  id: string;
  name: string;
  type: "profile_frame" | "globe_theme" | "satellite_trail" | "temp_pro_pass";
  description: string;
  requirement_type: string;
  requirement_threshold: number;
  duration_hours: number | null;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_id: string;
  expires_at: string | null;
  claimed_at: string;
  definition?: RewardDefinition;
}

export const rewardService = {
  async getAllRewards(): Promise<RewardDefinition[]> {
    const { data, error } = await supabase
      .from("reward_definitions")
      .select("*")
      .order("requirement_threshold", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getUserRewards(): Promise<UserReward[]> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    const { data, error } = await supabase
      .from("user_rewards")
      .select("*, definition:reward_definitions(*)")
      .eq("user_id", session.user.id)
      .order("claimed_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async claimReward(rewardId: string): Promise<boolean> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: Authentication required.");
    }

    const { data, error } = await supabase.rpc("claim_reward", {
      p_reward_id: rewardId,
    });

    if (error) {
      throw new Error(error.message || "Failed to claim orbital reward.");
    }

    return !!data;
  },
};