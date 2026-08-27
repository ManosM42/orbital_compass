import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { subscriptionService, type UserSubscription } from "@/services/subscription/subscriptionService";
import { entitlementService } from "@/services/subscription/entitlementService";
import { useAuth } from "./AuthContext";

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  hasFeature: (featureKey: string) => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    try {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }
      const sub = await subscriptionService.getUserSubscription();
      setSubscription(sub);
    } catch (err) {
      console.error("Failed to load subscription status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();

    if (!user) return;

    // Subscribe to realtime database changes on user_subscriptions for instant UI updates
    const channel = supabase
      .channel(`public:user_subscriptions:user_id=eq.${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch subscription state immediately when webhook updates the database
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const hasFeature = async (featureKey: string): Promise<boolean> => {
    return await entitlementService.hasFeature(featureKey);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        hasFeature,
        refreshSubscription: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}