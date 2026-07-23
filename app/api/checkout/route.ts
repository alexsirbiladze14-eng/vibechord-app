/**
 * /api/checkout
 *
 * Creates a Lemon Squeezy checkout for one of the 5 plans in
 * lib/lemonsqueezy.ts, and returns its hosted URL for the browser to
 * redirect to. Kept the exact same request/response shape as the
 * original Stripe version ({ plan, userId, userEmail } in, { url } out)
 * so PricingPanel.tsx needed zero changes when switching providers.
 */

import { createCheckoutUrl, PLAN_CONFIG, type PlanKey } from "@/lib/lemonsqueezy";

export async function POST(request: Request) {
  let body: { plan?: unknown; userId?: unknown; userEmail?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const plan = body.plan as PlanKey;
  const userId = typeof body.userId === "string" ? body.userId : "";
  const userEmail =
    typeof body.userEmail === "string" ? body.userEmail : undefined;

  if (!userId) {
    return Response.json(
      { error: "You need to be logged in to purchase credits." },
      { status: 401 }
    );
  }
  if (!PLAN_CONFIG[plan]) {
    return Response.json({ error: "Unknown plan." }, { status: 400 });
  }

  const origin = request.headers.get("origin") || "http://localhost:3000";

  try {
    const url = await createCheckoutUrl(
      plan,
      userId,
      userEmail,
      `${origin}/?checkout=success`
    );
    return Response.json({ url });
  } catch (err) {
    console.error("checkout error:", err);
    return Response.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Couldn't start checkout. Try again in a moment.",
      },
      { status: 502 }
    );
  }
}
