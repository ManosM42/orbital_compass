import { supabase } from "@/lib/supabase/client";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  satellite_alerts: boolean;
  iss_alerts: boolean;
  visibility_min_magnitude: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  alert_timing_minutes: number;
  updated_at: string;
}

export const notificationService = {
  async getPreferences(): Promise<NotificationPreferences | null> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    return data || {
      id: "default",
      user_id: session.user.id,
      push_enabled: false,
      satellite_alerts: true,
      iss_alerts: true,
      visibility_min_magnitude: 3.5,
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00:00",
      quiet_hours_end: "07:00:00",
      alert_timing_minutes: 15,
      updated_at: new Date().toISOString(),
    };
  },

  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<void> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    const { error } = await supabase
      .from("notification_preferences")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id);

    if (error) throw new Error(error.message);
  },
};