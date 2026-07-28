"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type AuthUser = { id: string; email: string };

// Plan keys match app/api/checkout/route.ts's PLAN_CONFIG exactly —
// these aren't cosmetic labels, they're what tells the checkout route
// which real Lemon Squeezy variant to use.
const SUBSCRIPTIONS = [
  {
    plan: "hobbyist",
    label: "Hobbyist",
    price: "$8",
    period: "/month",
    features: [
      "150 AI generations/month",
      "Interactive fretboard & audio playback",
      "Save up to 50 songs",
    ],
  },
  {
    plan: "pro",
    label: "Pro / Producer",
    price: "$18",
    period: "/month",
    features: [
      "500 AI generations/month",
      "Everything in Hobbyist",
      "Alternate tunings & advanced theory analysis",
      "Priority access to new features",
    ],
    highlight: true,
  },
] as const;

const PACKS = [
  { plan: "pack_small", label: "Quick Jam Pack", price: "$3", credits: "50 credits" },
  { plan: "pack_medium", label: "Songwriter Pack", price: "$7", credits: "150 credits" },
  { plan: "pack_large", label: "Producer Pack", price: "$15", credits: "400 credits" },
] as const;

export default function PremiumPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setAuthUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });
  }, []);

  async function handleCheckout(plan: string) {
    if (!authUser) {
      router.push("/login");
      return;
    }
    setLoadingPlan(plan);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId: authUser.id, userEmail: authUser.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-rosewood px-4 py-20">
      <div className="absolute left-6 top-6">
        <Link
          href="/chat"
          className="flex items-center gap-2 text-sm text-ash transition-colors hover:text-parchment"
        >
          <ArrowLeft size={16} />
          Back to Vibechord
        </Link>
      </div>

      <div className="mb-12 text-center">
        <h1 className="font-display text-3xl font-semibold text-parchment">
          Upgrade Your Workflow
        </h1>
        <p className="mt-4 max-w-md text-sm text-ash">
          Every free account starts with 10 credits. Subscribe for more every
          month, or top up any time with a one-time pack.
        </p>
        {!authUser && (
          <p className="mt-3 text-xs text-ash">
            <Link href="/login" className="text-brass hover:underline">
              Log in
            </Link>{" "}
            first — checkout needs an account to credit.
          </p>
        )}
        {error && <p className="mt-3 text-xs text-rust">{error}</p>}
      </div>

      <div className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-2">
        {SUBSCRIPTIONS.map((tier) => (
          <div
            key={tier.plan}
            className={`relative flex flex-col overflow-hidden rounded-xl border p-8 ${
              tier.highlight
                ? "border-brass/50 bg-slate/10"
                : "border-slate bg-rosewood/50"
            }`}
          >
            {tier.highlight && (
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brass/10 blur-3xl" />
            )}
            <h2
              className={`font-display text-xl ${tier.highlight ? "text-brass" : "text-parchment"}`}
            >
              {tier.label}
            </h2>
            <div className="my-6 text-3xl font-semibold text-parchment">
              {tier.price}
              <span className="text-sm font-normal text-ash">{tier.period}</span>
            </div>
            <ul
              className={`mb-8 flex-1 space-y-4 text-sm ${
                tier.highlight ? "text-parchment" : "text-ash"
              }`}
            >
              {tier.features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <Check size={16} className={tier.highlight ? "text-brass" : "text-slate"} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(tier.plan)}
              disabled={loadingPlan !== null}
              className={`w-full rounded-lg py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
                tier.highlight
                  ? "bg-brass text-rosewood"
                  : "border border-slate bg-transparent text-parchment hover:bg-slate/30"
              }`}
            >
              {loadingPlan === tier.plan ? "…" : `Subscribe to ${tier.label}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 w-full max-w-4xl">
        <p className="mb-3 text-center text-xs text-ash">
          Or top up any time — credits never expire.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {PACKS.map((p) => (
            <button
              key={p.plan}
              onClick={() => handleCheckout(p.plan)}
              disabled={loadingPlan !== null}
              className="rounded-lg border border-slate bg-rosewood/50 p-4 text-center transition-colors hover:border-brass disabled:opacity-50"
            >
              <div className="font-display text-sm text-parchment">{p.label}</div>
              <div className="mt-1 text-lg font-semibold text-brass">{p.price}</div>
              <div className="text-xs text-ash">{p.credits}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
