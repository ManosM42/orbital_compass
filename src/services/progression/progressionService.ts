import { supabase } from "@/lib/supabase/client";

export interface XpTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

export interface CommanderRank {
  level: number;
  xp: number;
  xpToNextLevel: number;
  progressPercent: number;
}

export const progressionService = {
  async getXpHistory(): Promise<XpTransaction[]> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    const { data, error } = await supabase
      .from("xp_transactions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async calculateRank(xp: number, level: number): Promise<CommanderRank> {
    const xpForCurrentLevel = (level - 1) * 500;
    const xpIntoLevel = xp - xpForCurrentLevel;
    const progressPercent = Math.min(Math.max((xpIntoLevel / 500) * 100, 0), 100);

    return {
      level,
      xp,
      xpToNextLevel: 500 - xpIntoLevel,
      progressPercent: Math.round(progressPercent),
    };
  },

  /**
   * Securely invokes server-side RPC to award XP. Never trusts client math or direct table writes.
   */
  async awardXpSecure(amount: number, reason: string, referenceId?: string): Promise<void> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: Authentication required.");
    }

    const { error } = await supabase.rpc("award_xp", {
      p_user_id: session.user.id,
      p_amount: amount,
      p_reason: reason,
      p_reference_id: referenceId || null,
    });

    if (error) {
      throw new Error(error.message || "Failed to award experience points.");
    }
  },
};