import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { X, Sparkles, Loader2, ShieldCheck, Mail, Lock, User as UserIcon } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  plan: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthModalOpen: boolean;
  selectedPriceId: string | null;
  selectedPlanId: string | null;
  openAuthModal: (priceId?: string, planId?: string) => void;
  closeAuthModal: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };

  useEffect(() => {
    // 1. Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    // 2. Listen to Auth State Changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const openAuthModal = (priceId?: string, planId?: string) => {
    setSelectedPriceId(priceId || null);
    setSelectedPlanId(planId || null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setSelectedPriceId(null);
    setSelectedPlanId(null);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthModalOpen,
        selectedPriceId,
        selectedPlanId,
        openAuthModal,
        closeAuthModal,
        logout,
        refreshProfile,
      }}
    >
      {children}
      {isAuthModalOpen && (
        <AuthModal
          priceId={selectedPriceId}
          planId={selectedPlanId}
          onClose={closeAuthModal}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// --------------------------------------------------------------------
// Complete Sign In / Register Modal with Supabase Profile Save
// --------------------------------------------------------------------
function AuthModal({
  priceId,
  planId,
  onClose,
}: {
  priceId: string | null;
  planId: string | null;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let activeUser: User | null = null;

      if (mode === "signup") {
        // Sign Up with metadata for profile trigger
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (signUpErr) throw signUpErr;
        activeUser = data.user;
      } else {
        // Sign In
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
        activeUser = data.user;
      }

      if (activeUser && planId) {
        // Update profile plan in Supabase
        await supabase
          .from("profiles")
          .update({ plan: planId, full_name: fullName || undefined })
          .eq("id", activeUser.id);
      }

      // If priceId exists and is NOT free, trigger Stripe Checkout
      if (priceId && priceId !== "free") {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ priceId, email }),
        });

        const resData = await response.json();
        if (!response.ok) throw new Error(resData.message || "Failed to initiate Stripe Checkout.");

        if (resData.checkoutUrl) {
          window.location.href = resData.checkoutUrl;
          return;
        }
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-primary/30 bg-card p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary mb-2">
          <Sparkles className="h-4 w-4" />
          ORBITAL Commander Authentication
        </div>

        <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {mode === "signup" ? "Create Account" : "Welcome Back"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {planId ? `Set up access to activate the ${planId.toUpperCase()} tier.` : "Authenticate your orbital credentials."}
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs font-mono text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Commander Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="Commander Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/40 pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="commander@orbital.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/40 pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/40 pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Encrypted transmission · Profile sync to Supabase</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "signup" ? (
              priceId && priceId !== "free" ? "Create Account & Proceed to Checkout" : "Create Explorer Account"
            ) : (
              priceId && priceId !== "free" ? "Sign In & Proceed to Checkout" : "Sign In to Account"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground border-t border-border/50 pt-4">
          {mode === "signup" ? (
            <span>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="text-primary font-bold hover:underline">
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need a commander account?{" "}
              <button onClick={() => setMode("signup")} className="text-primary font-bold hover:underline">
                Register
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}