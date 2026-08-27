import { supabase } from "@/lib/supabase/client";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  requirement_type: string;
  requirement_threshold: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  definition?: BadgeDefinition;
}

export const badgeService = {
  async getAllBadges(): Promise<BadgeDefinition[]> {
    const { data, error } = await supabase
      .from("badge_definitions")
      .select("*")
      .order("requirement_threshold", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getUserBadges(): Promise<UserBadge[]> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    const { data, error } = await supabase
      .from("user_badges")
      .select("*, definition:badge_definitions(*)")
      .eq("user_id", session.user.id)
      .order("unlocked_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async evaluateAndAwardBadge(badgeId: string): Promise<boolean> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: Authentication required.");
    }

    const { data, error } = await supabase.rpc("award_badge", {
      p_user_id: session.user.id,
      p_badge_id: badgeId,
    });

    if (error) {
      console.error("Badge evaluation error:", error.message);
      return false;
    }

    return !!data;
  },
};