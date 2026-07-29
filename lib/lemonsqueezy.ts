/**
 * lemonsqueezy.ts
 *
 * Server-only. Never import this from a "use client" component — it
 * reads LEMONSQUEEZY_API_KEY, which must never reach the browser.
 *
 * Deliberately uses plain fetch() rather than an SDK — Lemon Squeezy's
 * API is a straightforward JSON:API REST interface, and the official
 * SDK adds a dependency for very little benefit here. One less package
 * to install, one less thing that could be version-incompatible.
 */

export type PlanKey =
  | "hobbyist"
  | "pro"
  | "pack_small"
  | "pack_medium"
  | "pack_large";

export type PlanConfig = {
  variantEnvVar: string;
  credits: number;
  label: string;
};

// Actual Lemon Squeezy Variant IDs come from products YOU create in
// your Lemon Squeezy dashboard — see BILLING.md for exact steps. This
// file only defines which env var holds each variant ID and how many
// credits it grants; it never hardcodes a real ID.
export const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  hobbyist: {
    variantEnvVar: "LEMONSQUEEZY_VARIANT_HOBBYIST",
    credits: 150,
    label: "Hobbyist — GEL 14.99/month",
  },
  pro: {
    variantEnvVar: "LEMONSQUEEZY_VARIANT_PRO",
    credits: 500,
    label: "Pro / Producer — GEL 24.99/month",
  },
  pack_small: {
    variantEnvVar: "LEMONSQUEEZY_VARIANT_PACK_SMALL",
    credits: 50,
    label: "Quick Jam Pack — GEL 4.99",
  },
  pack_medium: {
    variantEnvVar: "LEMONSQUEEZY_VARIANT_PACK_MEDIUM",
    credits: 150,
    label: "Songwriter Pack — GEL 7.99",
  },
  pack_large: {
    variantEnvVar: "LEMONSQUEEZY_VARIANT_PACK_LARGE",
    credits: 400,
    label: "Producer Pack — GEL 14.99",
  },
};

/**
 * Creates a Lemon Squeezy checkout and returns its hosted URL. The
 * user id, plan, and credit amount are passed through as custom_data —
 * Lemon Squeezy echoes this back verbatim in every webhook event tied
 * to this checkout, which is how the webhook route later knows who to
 * credit and by how much without re-deriving it from the variant.
 *
 * Note there's no "subscription vs one-time" distinction to set here —
 * that's entirely determined by how the variant itself was configured
 * in the Lemon Squeezy dashboard (a subscription product renews on its
 * own; a one-time product doesn't). Simpler than Stripe in this regard.
 */
export async function createCheckoutUrl(
  plan: PlanKey,
  userId: string,
  userEmail: string | undefined,
  redirectUrl: string
): Promise<string> {
  const config = PLAN_CONFIG[plan];
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env[config.variantEnvVar];

  if (!apiKey || !storeId) {
    throw new Error(
      "LEMONSQUEEZY_API_KEY or LEMONSQUEEZY_STORE_ID is not set. See BILLING.md."
    );
  }
  if (!variantId) {
    throw new Error(
      `${config.variantEnvVar} is not set. Create this product in your Lemon Squeezy dashboard and add its variant ID to .env.local — see BILLING.md.`
    );
  }

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: userEmail || undefined,
            custom: { userId, plan, credits: String(config.credits) },
          },
          product_options: {
            redirect_url: redirectUrl,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Lemon Squeezy checkout creation failed:", errText);
    throw new Error("Couldn't create checkout with Lemon Squeezy.");
  }

  const json = await res.json();
  const url = json?.data?.attributes?.url;
  if (!url) throw new Error("Lemon Squeezy response had no checkout URL.");
  return url;
}