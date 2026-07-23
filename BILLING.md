# Week 9 billing setup: Lemon Squeezy

Stripe doesn't support opening a merchant account from Georgia (it's
not one of their ~46 directly-supported countries), so this app uses
**Lemon Squeezy** instead — a "Merchant of Record" that supports
sellers in hundreds of countries (it's also owned by Stripe itself,
so it's not some sketchy workaround). All the CODE is already built;
this is everything only you can do, since it needs your own account.

Supabase setup is unchanged — if you already did that part, skip to
Part 2 below.

## Part 1: Supabase (10 minutes) — skip if already done

1. supabase.com -> New Project -> wait for it to provision
2. SQL Editor -> New query -> paste in the entire `supabase/schema.sql` -> Run
3. Settings -> API Keys -> copy the anon/publishable key and the
   service_role/secret key into `.env.local`
4. Settings -> Data API -> copy the Project URL into `.env.local`
5. Authentication -> URL Configuration -> add `http://localhost:3000`

## Part 2: Lemon Squeezy (15 minutes)

1. Go to **lemonsqueezy.com**, sign up, and create a **Store**.
   You can toggle **Test mode** (top of the dashboard) while
   developing — no real charges happen in test mode.

2. Go to **Products -> New product**, and create these 5:

   | Name | Price | Type |
   |---|---|---|
   | Hobbyist | $8.00 | Subscription, monthly |
   | Pro / Producer | $18.00 | Subscription, monthly |
   | Quick Jam Pack | $3.00 | Single payment |
   | Songwriter Pack | $7.00 | Single payment |
   | Producer Pack | $15.00 | Single payment |

3. Each product has a **Variant** (the specific purchasable version —
   even a single-price product has one default variant). Click into
   each product, find its Variant, and copy its **Variant ID** (a
   number) into `.env.local`:
   - Hobbyist -> `LEMONSQUEEZY_VARIANT_HOBBYIST`
   - Pro / Producer -> `LEMONSQUEEZY_VARIANT_PRO`
   - Quick Jam Pack -> `LEMONSQUEEZY_VARIANT_PACK_SMALL`
   - Songwriter Pack -> `LEMONSQUEEZY_VARIANT_PACK_MEDIUM`
   - Producer Pack -> `LEMONSQUEEZY_VARIANT_PACK_LARGE`

4. Go to **Settings -> General** and copy your **Store ID** (a number)
   into `LEMONSQUEEZY_STORE_ID`.

5. Go to **Settings -> API** -> **Create API key**, copy it into
   `LEMONSQUEEZY_API_KEY`.

6. Go to **Settings -> Webhooks -> +** (add webhook):
   - **URL:** for local testing, Lemon Squeezy needs a real public
     URL — it can't reach `localhost` directly. Use a tunnel tool
     like **ngrok** (`ngrok http 3000`, then use the `https://...`
     URL it gives you) or an alternative (Cloudflare Tunnel,
     localtunnel). Point the webhook at:
     `https://your-tunnel-url.ngrok-free.app/api/lemonsqueezy-webhook`
   - For your LIVE deployed site (once on Vercel), use
     `https://your-domain.com/api/lemonsqueezy-webhook` instead.
   - **Signing secret:** type any random string (6-40 characters) —
     you're choosing this value yourself, not copying one Lemon
     Squeezy generated. Put the SAME string in
     `LEMONSQUEEZY_WEBHOOK_SECRET`.
   - **Events:** check `order_created` and `subscription_payment_success`.

7. Restart `npm run dev` after editing `.env.local`.

## Testing a purchase without real money

In Test mode, Lemon Squeezy accepts card number `4242 4242 4242 4242`,
any future expiry, any CVC. Sign up / log in to the app first, then
try buying a credit pack — you should land on a real Lemon Squeezy
checkout page, complete it with the test card, get redirected back,
and see your credits increase within a few seconds (the webhook does
this in the background — keep your ngrok tunnel running while testing
locally, or it won't be reachable).

## What's still simplified (documented, not hidden)

- No "manage subscription" / cancel-from-the-app UI yet — customers
  can manage or cancel directly through the receipt/customer portal
  link Lemon Squeezy emails them.
- Failed payments and disputes aren't specially handled — Lemon
  Squeezy's own retry logic and dashboard cover these for now.
- The webhook's duplicate-delivery protection hashes the request body
  rather than using a single stable event id (documented in the code
  comment in `app/api/lemonsqueezy-webhook/route.ts`) — Lemon Squeezy
  doesn't expose one as reliably as Stripe does for subscription
  events, and body-hashing turns out to handle this correctly anyway.
