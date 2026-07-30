"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { apiUrl } from "@/lib/apiUrl";
import PricingCard from "@/components/PricingCard";

type AuthUser = { id: string; email: string };

const SUBSCRIPTIONS = [
  {
    plan: "hobbyist",
    label: "Hobbyist",
    price: "GEL 14.99",
    period: "/month",
    features: [
      "150 AI generations/month",
      "Interactive fretboard & audio playback",
      "Unlimited saved songs",
    ],
    highlight: false,
  },
  {
    plan: "pro",
    label: "Pro / Producer",
    price: "GEL 24.99",
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
  { plan: "pack_small", label: "Quick Jam Pack", price: "GEL 4.99", credits: "50 credits" },
  { plan: "pack_medium", label: "Songwriter Pack", price: "GEL 7.99", credits: "150 credits" },
  { plan: "pack_large", label: "Producer Pack", price: "GEL 14.99", credits: "400 credits" },
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
      const res = await fetch(apiUrl("/api/checkout"), {
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
    // FIX #1: this page used to sit inside the root layout's
    // `overflow-hidden` body with only `min-h-screen` on itself, so on
    // a phone the bottom half of the pricing list was simply
    // unreachable — nothing to scroll on. It now owns its own
    // `h-[100dvh] overflow-y-auto` scroll container.
    <div className="h-[100dvh] w-full overflow-y-auto bg-rosewood px-4 py-20">
      <div className="absolute left-6 top-6">
        <Link
          href="/chat"
          className="flex items-center gap-2 text-sm text-ash transition-colors hover:text-parchment"
        >
          <ArrowLeft size={16} />
          Back to Vibechord
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-12 text-center"
      >
        <h1 className="font-display text-3xl font-semibold text-parchment">
          Upgrade Your Workflow
        </h1>
        <p className="mt-4 max-w-md mx-auto text-sm text-ash">
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
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-2"
      >
        {SUBSCRIPTIONS.map((tier) => (
          <PricingCard
            key={tier.plan}
            variant="subscription"
            label={tier.label}
            price={tier.price}
            period={tier.period}
            features={tier.features}
            highlight={tier.highlight}
            loading={loadingPlan !== null}
            onSelect={() => handleCheckout(tier.plan)}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        className="mx-auto mt-10 w-full max-w-4xl pb-12"
      >
        <p className="mb-3 text-center text-xs text-ash">
          Or top up any time — credits never expire.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {PACKS.map((p) => (
            <PricingCard
              key={p.plan}
              variant="pack"
              label={p.label}
              price={p.price}
              credits={p.credits}
              loading={loadingPlan !== null}
              onSelect={() => handleCheckout(p.plan)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
