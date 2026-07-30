"use client";

import { Check } from "lucide-react";

type SubscriptionCardProps = {
  variant: "subscription";
  label: string;
  price: string;
  period: string;
  features: readonly string[];
  highlight?: boolean;
  loading: boolean;
  onSelect: () => void;
};

type PackCardProps = {
  variant: "pack";
  label: string;
  price: string;
  credits: string;
  loading: boolean;
  onSelect: () => void;
};

type Props = SubscriptionCardProps | PackCardProps;

/**
 * PricingCard
 *
 * Extracted from app/premium/page.tsx — both the subscription tiles and
 * the one-time credit-pack tiles were near-duplicate JSX blocks inline
 * in the page. Pulling them into one component with a `variant` prop
 * shrinks the page file and means a style tweak (color, radius, hover)
 * only has to happen in one place.
 */
export default function PricingCard(props: Props) {
  if (props.variant === "pack") {
    const { label, price, credits, loading, onSelect } = props;
    return (
      <button
        onClick={onSelect}
        disabled={loading}
        className="rounded-lg border border-slate bg-rosewood/50 p-4 text-center transition-all hover:border-brass hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <div className="font-display text-sm text-parchment">{label}</div>
        <div className="mt-1 text-lg font-semibold text-brass">{price}</div>
        <div className="text-xs text-ash">{credits}</div>
      </button>
    );
  }

  const { label, price, period, features, highlight, loading, onSelect } = props;
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border p-8 transition-transform duration-300 hover:-translate-y-1 ${
        highlight ? "border-brass/50 bg-slate/10" : "border-slate bg-rosewood/50"
      }`}
    >
      {highlight && (
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brass/10 blur-3xl" />
      )}
      <h2 className={`font-display text-xl ${highlight ? "text-brass" : "text-parchment"}`}>
        {label}
      </h2>
      <div className="my-6 text-3xl font-semibold text-parchment">
        {price}
        <span className="text-sm font-normal text-ash">{period}</span>
      </div>
      <ul className={`mb-8 flex-1 space-y-4 text-sm ${highlight ? "text-parchment" : "text-ash"}`}>
        {features.map((f) => (
          <li key={f} className="flex items-center gap-3">
            <Check size={16} className={highlight ? "text-brass" : "text-slate"} />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        disabled={loading}
        className={`w-full rounded-lg py-3 text-sm font-medium transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 ${
          highlight
            ? "bg-brass text-rosewood"
            : "border border-slate bg-transparent text-parchment hover:bg-slate/30"
        }`}
      >
        {loading ? "…" : `Subscribe to ${label}`}
      </button>
    </div>
  );
}
