# ORBITAL repair patch — Stages 1–3 (Auth, Database, Stripe)

## How to apply
Extract this zip's contents directly into the root of your `orbital_compass`
repo, overwriting the existing files at the same paths.

## ⚠️ Delete these 2 files manually — the zip cannot delete for you
These were fake/orphaned auth implementations, replaced by
`src/context/AuthContext.tsx`. They must be removed or you'll have dead code
sitting alongside the real system again:

- `src/components/AuthProvider.tsx`   (the fake, non-Supabase auth provider)
- `src/services/auth/authService.ts`  (a third, unused auth implementation)

## New files in this patch (didn't exist before)
- src/components/AuthModal.tsx
- src/routes/auth.callback.tsx
- src/server/billingPortalImpl.server.ts
- src/services/subscription/billingPortalServerFn.ts
- src/services/subscription/checkoutServerFn.ts
- src/services/subscription/checkoutService.ts
- src/routes/api.stripe.webhook.ts
- supabase/migrations/0001_core_schema.sql  (you already ran this in
  Supabase SQL Editor — included here for version control / repo history)

## Renamed file
- `src/server/stripeCheckout.ts` → `src/server/stripeCheckoutImpl.server.ts`
  If your working copy still has the old `stripeCheckout.ts`, delete it after
  extracting (this patch doesn't include it under its old name).

## Modified files (overwrite existing)
- src/context/AuthContext.tsx
- src/routes/__root.tsx
- src/routes/pricing.tsx
- src/components/Chrome.tsx
- src/services/profile/profileService.ts
- src/routes/missions.tsx (was an empty file)
- src/server/stripe.ts (was empty)
- src/server/webhookHandler.ts
- src/components/CheckoutModal.tsx
- src/routes/profile.tsx

## After extracting
```bash
npm install stripe        # if not already installed
npm run build              # or: npx vite build
npx tsc --noEmit           # confirm no new type errors
```

## Required environment variables
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_INTELLIGENCE_MONTHLY=price_...
STRIPE_PRICE_INTELLIGENCE_YEARLY=price_...
VITE_SITE_URL=http://localhost:5173
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Point your Stripe webhook at: `https://yourdomain.com/api/stripe/webhook`
(or `stripe listen --forward-to localhost:5173/api/stripe/webhook` locally).
