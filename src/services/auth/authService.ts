import { supabase } from "@/lib/supabase/client";

export const authService = {
  async signUp(email: string, password: string, redirectTo?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Failed to create account.");
    }
  },

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Failed to sign in. Check your credentials.");
    }
  },

  async signInWithGoogle(redirectTo?: string) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo || window.location.origin,
        },
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Failed to authenticate with Google.");
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err: any) {
      throw new Error(err.message || "Failed to sign out.");
    }
  },

  async resetPassword(email: string, redirectTo?: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    } catch (err: any) {
      throw new Error(err.message || "Failed to send password reset email.");
    }
  },

  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (err: any) {
      throw new Error(err.message || "Failed to retrieve session.");
    }
  },
};