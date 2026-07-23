/**
 * stripe.ts
 *
 * Server-only. Never import this from a "use client" component — it
 * reads STRIPE_SECRET_KEY, which must never reach the browser.
 */

import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (see .env.local.example)."
    );
  }
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

export type PlanKey =
  | "hobbyist"
  | "pro"
  | "pack_small"
  | "pack_medium"
  | "pack_large";

export type PlanConfig = {
  priceEnvVar: string;
  mode: "subscription" | "payment";
  credits: number;
  label: string;
};

// Actual Stripe Price IDs come from YOUR Stripe dashboard once you
// create these products there — see BILLING.md for exact steps. This
// file only defines which env var holds each price ID and how many
// credits each grants; it never hardcodes a real price ID.
export const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  hobbyist: {
    priceEnvVar: "STRIPE_PRICE_HOBBYIST",
    mode: "subscription",
    credits: 150,
    label: "Hobbyist — $8/month",
  },
  pro: {
    priceEnvVar: "STRIPE_PRICE_PRO",
    mode: "subscription",
    credits: 500,
    label: "Pro / Producer — $18/month",
  },
  pack_small: {
    priceEnvVar: "STRIPE_PRICE_PACK_SMALL",
    mode: "payment",
    credits: 50,
    label: "Quick Jam Pack — $3",
  },
  pack_medium: {
    priceEnvVar: "STRIPE_PRICE_PACK_MEDIUM",
    mode: "payment",
    credits: 150,
    label: "Songwriter Pack — $7",
  },
  pack_large: {
    priceEnvVar: "STRIPE_PRICE_PACK_LARGE",
    mode: "payment",
    credits: 400,
    label: "Producer Pack — $15",
  },
};
