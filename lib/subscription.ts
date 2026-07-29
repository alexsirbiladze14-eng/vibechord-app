/**
 * subscription.ts
 *
 * Small shared constants for the subscription-gated features:
 *  - Tone Matching Assistant (subscriber-only)
 *  - Advanced skill tier (subscriber-only)
 *  - Unlimited saved songs (free tier capped)
 *
 * Credits (from Week 9) are unaffected by any of this — they keep
 * gating AI *usage volume* for everyone, subscriber or not. This file
 * is about gating specific *features*, a separate axis entirely.
 */

export const SUBSCRIPTION_PLAN_KEYS = ["hobbyist", "pro"] as const;

export const FREE_SAVED_SONGS_LIMIT = 3;

export function isSubscriptionPlan(plan: unknown): boolean {
  return (
    typeof plan === "string" &&
    (SUBSCRIPTION_PLAN_KEYS as readonly string[]).includes(plan)
  );
}