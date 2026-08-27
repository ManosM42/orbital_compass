import { supabase } from "@/lib/supabase/client";

export interface UserPreferences {
  theme?: "dark" | "light" | "system";
  notificationsEnabled?: boolean;
  units?: "metric" | "imperial";
}

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferences: UserPreferences;
  level: number;
  xp: number;
  badges: Array<{ id: string; name: string; icon: string; unlockedAt: string }>;
  sightings_count: number;
  current_plan: string;
  updated_at: string;
}

export const profileService = {
  async getSecureProfile(): Promise<{ profile: UserProfile | null; email: string | null }> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    const userId = session.user.id;
    const email = session.user.email ?? null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      throw new Error(profileError.message);
    }

    return {
      profile: profile || {
        id: userId,
        username: email?.split("@")[0] || "commander",
        display_name: "Orbital Commander",
        avatar_url: null,
        bio: "",
        preferences: { theme: "dark", notificationsEnabled: true, units: "metric" },
        level: 1,
        xp: 150,
        badges: [
          { id: "p1", name: "First Pass", icon: "🛰️", unlockedAt: new Date().toISOString() }
        ],
        sightings_count: 3,
        current_plan: "free",
        updated_at: new Date().toISOString(),
      },
      email,
    };
  },

  async updateProfile(updates: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    preferences?: UserPreferences;
  }): Promise<void> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    // Enforce server-side ownership by explicitly targeting auth.uid()
    const { error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    if (error) throw new Error(error.message);
  },

  async uploadAvatar(file: File): Promise<string> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    const userId = session.user.id;
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Math.random().toString(36.substring(2))}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  },
};