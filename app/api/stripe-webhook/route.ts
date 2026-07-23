/**
 * /api/stripe-webhook
 *
 * Stripe calls this URL directly (not the browser) whenever something
 * billing-related happens. This is the ONLY place in the app that
 * uses the Supabase SERVICE ROLE key — it deliberately bypasses Row
 * Level Security, because this is the one legitimate case where the
 * server needs to credit an account on a user's behalf, based on a
 * verified signature from Stripe rather than a user request.
 *
 * Handles two event types:
 *  - checkout.session.completed — the first payment (one-time pack,
 *    or the first month of a subscription)
 *  - invoice.paid — subsequent monthly subscription renewals, which
 *    don't go through checkout.session.completed again
 *
 * Setup: in your Stripe dashboard, add a webhook endpoint pointing at
 * this route's URL, subscribed to exactly those two event types, and
 * put its signing secret in STRIPE_WEBHOOK_SECRET. See BILLING.md.
 */

import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

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

/** Returns true if this is the first time we've seen this Stripe
 * event id — false (and logs nothing further) if we've already
 * processed it, protecting against Stripe's at-least-once delivery
 * causing a double credit. */
async function claimEventOnce(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string
): Promise<boolean> {
  const { error } = await supabase.from("stripe_events").insert({ id: eventId });
  // A unique-constraint violation means we've already processed this
  // event id — that's the expected, safe outcome on a redelivery.
  return !error;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return Response.json(
      { error: "Webhook not configured." },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = getServiceClient();
  const isNewEvent = await claimEventOnce(supabase, event.id);
  if (!isNewEvent) {
    return Response.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits ?? 0);

    if (userId && credits > 0) {
      await supabase.rpc("add_credits", { uid: userId, amount: credits });

      // Remember the Stripe customer id for this user so future
      // subscription-renewal invoices (which only carry a customer id,
      // not our metadata directly) can still be matched back to them.
      if (typeof session.customer === "string") {
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: session.customer })
          .eq("id", userId);
      }
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const isRenewal = invoice.billing_reason === "subscription_cycle";
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : null;

    if (isRenewal && subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId;
      const credits = Number(subscription.metadata?.credits ?? 0);

      if (userId && credits > 0) {
        await supabase.rpc("add_credits", { uid: userId, amount: credits });
      }
    }
  }

  return Response.json({ received: true });
}
