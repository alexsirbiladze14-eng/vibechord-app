"use client";

import { useState } from "react";

type Props = {
  userId: string | null;
  userEmail: string | null;
};

// Prices shown here are the ACTUAL prices set on the corresponding
// Lemon Squeezy products (in GEL, your store's base currency) — kept
// in sync manually since Lemon Squeezy is the real source of truth
// for what gets charged, not this file.
const SUBSCRIPTIONS = [
  { plan: "hobbyist", label: "Hobbyist", price: "GEL 14.99/mo", credits: "150 credits/mo" },
  { plan: "pro", label: "Pro / Producer", price: "GEL 24.99/mo", credits: "500 credits/mo" },
] as const;

const PACKS = [
  { plan: "pack_small", label: "Quick Jam", price: "GEL 4.99", credits: "50 credits" },
  { plan: "pack_medium", label: "Songwriter", price: "GEL 7.99", credits: "150 credits" },
  { plan: "pack_large", label: "Producer", price: "GEL 14.99", credits: "400 credits" },
] as const;

export default function PricingPanel({ userId, userEmail }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(plan: string) {
    if (!userId) {
      setError("Log in above first — checkout needs an account to credit.");
      return;
    }
    setLoadingPlan(plan);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId, userEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Couldn't start checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate bg-rosewood/60 p-4">
      <p className="mb-3 font-mono text-xs text-ash">
        Out of credits, or want more? Free accounts start with 10.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {SUBSCRIPTIONS.map((s) => (
          <button
            key={s.plan}
            type="button"
            onClick={() => handleCheckout(s.plan)}
            disabled={loadingPlan !== null}
            className="rounded-md border border-slate bg-rosewood px-3 py-2 text-left transition-colors hover:border-brass disabled:opacity-50"
          >
            <div className="font-display text-sm text-parchment">
              {s.label}
            </div>
            <div className="font-mono text-xs text-brass">{s.price}</div>
            <div className="font-mono text-[10px] text-ash">{s.credits}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PACKS.map((p) => (
          <button
            key={p.plan}
            type="button"
            onClick={() => handleCheckout(p.plan)}
            disabled={loadingPlan !== null}
            className="rounded-md border border-slate bg-rosewood px-2 py-2 text-center transition-colors hover:border-brass disabled:opacity-50"
          >
            <div className="font-mono text-xs text-parchment">{p.price}</div>
            <div className="font-mono text-[10px] text-ash">{p.credits}</div>
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-rust">{error}</p>}
    </div>
  );
}