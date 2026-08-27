import { useState } from "react";
import { X, ShieldCheck, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { checkoutService } from "@/services/subscription/checkoutService";
import { cn } from "@/lib/utils";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanId?: string;
}

export function CheckoutModal({ isOpen, onClose, initialPlanId = "pro_monthly" }: CheckoutModalProps) {
  const [selectedPlan, setSelectedPlan] = useState(initialPlanId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      await checkoutService.redirectToCheckout(selectedPlan);
    } catch (err: any) {
      setError(err.message || "Checkout initialization failed.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="panel relative w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-primary/40 bg-card">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
          <Sparkles className="h-4 w-4" />
          Secure Stripe Gateway
        </div>

        <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Confirm Orbital Upgrade</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select your telemetry tier. Payments are securely processed and encrypted by Stripe.
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-destructive/50 bg-destructive/10 p-3 text-xs font-mono text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { id: "pro_monthly", name: "Pro Monthly", price: "€15 / mo" },
            { id: "pro_yearly", name: "Pro Yearly", price: "€144 / yr" },
            { id: "intelligence_monthly", name: "Intelligence Monthly", price: "€49 / mo" },
            { id: "intelligence_yearly", name: "Intelligence Yearly", price: "€470 / yr" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedPlan(item.id)}
              className={cn(
                "flex flex-col items-start rounded-2xl border p-4 text-left transition-all",
                selectedPlan === item.id
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/60 bg-secondary/30 hover:border-border",
              )}
            >
              <span className="font-display font-semibold text-foreground text-sm">{item.name}</span>
              <span className="mt-1 font-mono text-xs text-primary">{item.price}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>Encrypted TLS connection. Your card details never touch ORBITAL servers.</span>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting to Stripe...
              </>
            ) : (
              <>
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}