import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackRoute,
});

function AuthCallbackRoute() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // supabase-js parses the URL hash/query itself once the client loads;
    // we just need to wait for the resulting SIGNED_IN event (or an existing session).
    let finished = false;

    const finish = (to: string) => {
      if (finished) return;
      finished = true;
      navigate({ to });
    };

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (session) finish("/profile");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) finish("/profile");
      if (event === "PASSWORD_RECOVERY") finish("/profile?resetPassword=true");
    });

    // Fallback in case no event fires (e.g. link already used/expired)
    const timeout = setTimeout(() => finish("/"), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <a href="/" className="mt-4 inline-block text-sm text-primary underline">
              Return home
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Finalizing sign-in…</p>
          </>
        )}
      </div>
    </div>
  );
}
