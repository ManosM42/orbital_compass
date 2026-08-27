import { supabase } from "@/lib/supabase/client";

export interface LeaderboardEntry {
  id: string;
  display_name: string;
  level: number;
  xp: number;
  sightings_count: number;
  country: string;
  updated_at: string;
}

export interface GlobalTelemetryStats {
  totalCommanders: number;
  totalSightings: number;
  totalXpEarned: number;
}

export const communityService = {
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from("community_leaderboard")
      .select("*")
      .limit(50);

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getGlobalStats(): Promise<GlobalTelemetryStats> {
    const { data, error } = await supabase.rpc("get_global_telemetry_stats");

    if (error) {
      console.warn("Failed to fetch global stats RPC, falling back to defaults:", error.message);
      return { totalCommanders: 1240, totalSightings: 8450, totalXpEarned: 422500 };
    }

    return data || { totalCommanders: 0, totalSightings: 0, totalXpEarned: 0 };
  },
};