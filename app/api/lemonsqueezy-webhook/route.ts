/**
 * /api/lemonsqueezy-webhook
 *
 * Lemon Squeezy calls this URL directly (not the browser) whenever a
 * checkout completes or a subscription renews. Like the old Stripe
 * webhook, this is the ONLY place that uses the Supabase SERVICE ROLE
 * key — it deliberately bypasses Row Level Security, because this is
 * the one legitimate case where the server credits an account based
 * on a verified signature from Lemon Squeezy, not a user request.
 *
 * Two events matter here:
 *  - order_created — a one-time credit pack purchase
 *  - subscription_payment_success — fires for BOTH the first payment
 *    and every monthly renewal of a subscription, so this single event
 *    type covers everything a subscription needs (simpler than Stripe,
 *    which needed two separate event types for the same idea).
 *
 * Idempotency note: Lemon Squeezy doesn't reliably expose a stable,
 * unique-per-delivery event id the way Stripe's `event.id` does — for
 * subscription events, `data.id` is the SUBSCRIPTION's id, which stays
 * the same across every renewal, so it can't be used as a dedup key
 * (that would incorrectly treat every renewal after the first as a
 * duplicate). Instead, this hashes the raw request body: a genuine
 * retry of the same delivery has an identical body (correctly caught
 * as a duplicate), while two different real events (e.g. two separate
 * monthly renewals) always differ in their timestamp fields and so
 * hash differently (correctly NOT flagged as duplicates).
 *
 * Setup: in your Lemon Squeezy dashboard, add a webhook pointing at
 * this route's URL, subscribed to order_created and
 * subscription_payment_success, and put its signing secret in
 * LEMONSQUEEZY_WEBHOOK_SECRET. See BILLING.md.
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceKey);
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false; // e.g. length mismatch — definitely not a match
  }
}

/** Returns true if this exact request body hasn't been processed
 * before. Reuses the `stripe_events` table from schema.sql as a
 * generic "processed webhook bodies" store — the name is a legacy
 * leftover from switching payment providers, but its job (a text
 * primary key you insert-once-and-check) is identical either way, so
 * there was no need to make you re-run a schema migration for a
 * rename. */
async function claimBodyOnce(
  supabase: ReturnType<typeof getServiceClient>,
  rawBody: string
): Promise<boolean> {
  const hash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const { error } = await supabase.from("stripe_events").insert({ id: hash });
  return !error; // unique-constraint violation = already processed
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature");
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return Response.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const rawBody = await request.text();

  if (!verifySignature(rawBody, signature, secret)) {
    console.error("Lemon Squeezy webhook signature verification failed.");
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = getServiceClient();
  const isNewEvent = await claimBodyOnce(supabase, rawBody);
  if (!isNewEvent) {
    return Response.json({ received: true, duplicate: true });
  }

  let payload: {
    meta?: { event_name?: string; custom_data?: Record<string, string> };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const eventName = payload.meta?.event_name;
  const custom = payload.meta?.custom_data ?? {};
  const userId = custom.userId;
  const credits = Number(custom.credits ?? 0);

  const shouldCredit =
    (eventName === "order_created" || eventName === "subscription_payment_success") &&
    userId &&
    credits > 0;

  if (shouldCredit) {
    const { error } = await supabase.rpc("add_credits", {
      uid: userId,
      amount: credits,
    });
    if (error) {
      console.error("add_credits RPC failed:", error);
      // Still return 200 below — Lemon Squeezy would otherwise retry
      // and, since we've already claimed this body hash above, a retry
      // would be silently swallowed as a "duplicate" and never fixed.
      // A real production app would alert on this log line rather than
      // rely on the retry mechanism at all.
    }
  }

  return Response.json({ received: true });
}
