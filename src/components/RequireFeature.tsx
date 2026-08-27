import { useEffect, useState, type ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";
import { CheckoutModal } from "./CheckoutModal";

interface RequireFeatureProps {
  featureKey: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequireFeature({ featureKey, fallback, children }: RequireFeatureProps) {
  const { hasFeature, subscription, loading } = useSubscription();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    let mounted = true;
    hasFeature(featureKey).then((allowed) => {
      if (mounted) setIsAuthorized(allowed);
    });
    return () => {
      mounted = false;
    };
  }, [featureKey, subscription, hasFeature]);

  if (loading || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center p-8 font-mono text-xs text-muted-foreground animate-pulse">
        Verifying secure telemetry clearance...
      </div>
    );
  }

  if (!isAuthorized) {
    if (fallback) return <>{fallback}</>;

    return (
      <>
        <div className="panel relative overflow-hidden rounded-3xl border-primary/30 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-xl font-bold text-foreground">Restricted Orbital Telemetry</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            This module requires an upgraded Pro or Intelligence telemetry clearance. Unlock live element sets, advanced SGP4 feeds, and unlimited tracking instantly.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowCheckout(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-transform hover:scale-105"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade Telemetry Plan
            </button>
          </div>
        </div>

        <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} initialPlanId="pro_monthly" />
      </>
    );
  }

  return <>{children}</>;
}