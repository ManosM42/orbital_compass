import { supabase } from "@/lib/supabase/client";

export interface Mission {
  id: string;
  title: string;
  description: string;
  difficulty: "cadet" | "orbital" | "deep_space";
  category: "sighting" | "tracking" | "telemetry";
  target_norad_id: number | null;
  target_count: number;
  xp_reward: number;
  score_reward: number;
  is_daily: boolean;
}

export interface UserMission {
  id: string;
  user_id: string;
  mission_id: string;
  progress: number;
  status: "active" | "completed" | "claimed";
  completed_at: string | null;
  claimed_at: string | null;
  mission?: Mission;
}

export const missionService = {
  async getActiveMissions(): Promise<UserMission[]> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    // Fetch all available missions
    const { data: missions, error: missionError } = await supabase
      .from("missions")
      .select("*");

    if (missionError) throw new Error(missionError.message);

    // Fetch user progress records
    const { data: userMissions, error: userMissionError } = await supabase
      .from("user_missions")
      .select("*")
      .eq("user_id", session.user.id);

    if (userMissionError) throw new Error(userMissionError.message);

    // Map and combine catalog with user state (initialize missing records as active)
    const combined: UserMission[] = (missions || []).map((mission) => {
      const existing = (userMissions || []).find((um) => um.mission_id === mission.id);
      return {
        id: existing?.id || `temp-${mission.id}`,
        user_id: session.user.id,
        mission_id: mission.id,
        progress: existing?.progress || 0,
        status: existing?.status || "active",
        completed_at: existing?.completed_at || null,
        claimed_at: existing?.claimed_at || null,
        mission,
      };
    });

    return combined;
  },

  async claimMissionReward(missionId: string): Promise<boolean> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: Authentication required.");
    }

    const { data, error } = await supabase.rpc("claim_mission_reward", {
      p_mission_id: missionId,
    });

    if (error) {
      throw new Error(error.message || "Failed to claim mission reward.");
    }

    return !!data;
  },
};