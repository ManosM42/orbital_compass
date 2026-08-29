import { useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">(authModalMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const reset = () => {
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      if (mode === "signIn") {
        await signInWithPassword(email, password);
      } else if (mode === "signUp") {
        await signUpWithPassword(email, password);
        setInfo("Check your email to confirm your account.");
      } else if (mode === "reset") {
        await resetPassword(email);
        setInfo("Password reset email sent. Check your inbox.");
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    reset();
    setLoading(true);
    try {
      await signInWithGoogle();
      // Browser redirects away; no need to reset loading here.
    } catch (err: any) {
      setError(err.message ?? "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl border border-primary/30">
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="font-display text-xl font-bold text-foreground">
          {mode === "signUp"
            ? "Create your ORBITAL account"
            : mode === "reset"
              ? "Reset your password"
              : "Commander Authentication"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "reset"
            ? "We'll email you a link to reset your password."
            : "Sign in or create an account to unlock your mission profile."}
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {info && (
          <div className="mt-4 rounded-lg bg-primary/10 border border-primary/30 px-3 py-2 text-xs text-primary">
            {info}
          </div>
        )}

        {mode !== "reset" && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-secondary/50 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.85z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
            <input
              type="email"
              required
              placeholder="commander@orbital.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {mode !== "reset" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signUp" ? "Sign Up" : mode === "reset" ? "Send Reset Link" : "Sign In"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          {mode === "signIn" && (
            <>
              <button
                onClick={() => {
                  reset();
                  setMode("signUp");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Need an account? Sign up
              </button>
              <button
                onClick={() => {
                  reset();
                  setMode("reset");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </button>
            </>
          )}
          {mode === "signUp" && (
            <button
              onClick={() => {
                reset();
                setMode("signIn");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Already have an account? Sign in
            </button>
          )}
          {mode === "reset" && (
            <button
              onClick={() => {
                reset();
                setMode("signIn");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
