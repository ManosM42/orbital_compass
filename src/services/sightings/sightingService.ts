import { supabase } from "@/lib/supabase/client";

export interface Sighting {
  id: string;
  user_id: string;
  satellite_norad_id: number;
  satellite_name: string;
  observed_at: string;
  latitude: number;
  longitude: number;
  orbital_snapshot: Record<string, any>;
  visibility_score: number;
  image_url: string | null;
  verification_status: "pending" | "verified" | "rejected";
  xp_earned: number;
  metadata: Record<string, any>;
  created_at: string;
}

export const sightingService = {
  async getVerifiedSightings(limit = 20): Promise<Sighting[]> {
    const { data, error } = await supabase
      .from("sightings")
      .select("*")
      .eq("verification_status", "verified")
      .order("observed_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getUserSightings(): Promise<Sighting[]> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: No active session found.");
    }

    const { data, error } = await supabase
      .from("sightings")
      .select("*")
      .eq("user_id", session.user.id)
      .order("observed_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async recordSighting(input: {
    satelliteNoradId: number;
    satelliteName: string;
    observedAt: string;
    latitude: number;
    longitude: number;
    orbitalSnapshot?: Record<string, any>;
    visibilityScore?: number;
    imageFile?: File;
    metadata?: Record<string, any>;
  }): Promise<Sighting> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error("Unauthorized: Authentication required to log sightings.");
    }

    // Privacy safeguard: round coordinates to 2 decimal places (~1km precision)
    const privacyLat = Number(input.latitude.toFixed(2));
    const privacyLng = Number(input.longitude.toFixed(2));

    let imageUrl: string | null = null;

    if (input.imageFile) {
      const fileExt = input.imageFile.name.split(".").pop();
      const fileName = `sighting-${session.user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("sightings-media")
        .upload(fileName, input.imageFile, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("sightings-media")
          .getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("sightings")
      .insert({
        user_id: session.user.id,
        satellite_norad_id: input.satelliteNoradId,
        satellite_name: input.satelliteName,
        observed_at: input.observedAt,
        latitude: privacyLat,
        longitude: privacyLng,
        orbital_snapshot: input.orbitalSnapshot || {},
        visibility_score: input.visibilityScore || 4.2,
        image_url: imageUrl,
        verification_status: "verified",
        xp_earned: 50,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};