# Week 10: final polish + launch checklist

Everything code-related for the full 10-week plan is now built. What's
left is testing it thoroughly and the handful of steps that only you
can do (buying a domain, flipping services from test to live).

## What's new this week

- **BYOK (bring your own API key)** — a settings box (look for "Have
  your own Anthropic API key?") lets anyone paste their own Anthropic
  key. It's stored ONLY in their browser (localStorage) — never in
  Supabase, never sent anywhere except as a per-request field the AI
  routes hand straight to Anthropic. While a BYOK key is active,
  credits aren't spent at all — the user's own key and quota are used
  instead of yours.
- **Rate limiting** — a simple, honest guard (`lib/aiRouteHelpers.ts`)
  caps requests against YOUR OWN Anthropic key at 20/minute per IP
  address, to catch a runaway bug or bot before it runs up a real
  bill. BYOK requests are exempt (they spend the user's own quota, not
  yours, so there's nothing of yours to protect). Documented
  limitation: this is in-memory per server instance, a soft/best-effort
  limit — good enough for a hobby-scale app, not a hard guarantee at
  real scale (that would need a shared store like Upstash Redis).

## Final end-to-end test checklist

Go through every one of these once, in order, before considering this
"done":

- [ ] Fresh sign-up -> lands at 10 credits
- [ ] Type a vibe, generate -> real progression appears, credits go
      down by 1
- [ ] Hum a riff -> chords appear, credits DON'T go down (never an AI
      action)
- [ ] Type a refinement in the chat -> progression updates, credits go
      down by 1
- [ ] Click "Quiz me on this" -> AI-personalized explanation + working
      quiz, credits go down by 1
- [ ] Paste a BYOK key -> generate/refine/quiz all work AND credits
      stay unchanged
- [ ] Remove the BYOK key -> back to spending credits normally
- [ ] Save a song, refresh the page, load it back
- [ ] Buy a credit pack (test-mode) -> credits increase
- [ ] Log out -> app still works (unlimited local generation), just no
      saved songs/credits
- [ ] Try on your phone's browser (or resize your browser window
      narrow) -> check nothing is broken on a small screen
- [ ] Play a generated progression in "Listen" -> correct notes,
      correct tempo response

## Going live: switching from test mode to real money

1. **Lemon Squeezy**: go to your store settings and submit for review
   ("Activate Store," if you haven't already — do this early, since
   approval can take a few days). Once approved, toggle off Test mode.
   Re-check your webhook is still pointed at your real domain (not
   ngrok) and subscribed to the same two events.
2. **Connect a bank account** in Lemon Squeezy so payouts actually
   reach you (Step 7 from the store setup checklist).
3. Double check every environment variable is set in **Vercel**
   (Project -> Settings -> Environment Variables) — not just locally.
   Missing even one (especially `SUPABASE_SERVICE_ROLE_KEY` or
   `LEMONSQUEEZY_WEBHOOK_SECRET`) will silently break billing on the
   live site while local testing keeps working fine.

## Buying a domain

1. Buy a domain from any registrar (Namecheap, Porkbun, Google
   Domains successor, etc.) — a `.com` or `.app` both work fine.
2. In Vercel: Project -> Settings -> Domains -> add your domain,
   follow the DNS instructions it gives you (usually just adding one
   or two records at your registrar).
3. Once it's live on your real domain, update:
   - Supabase -> Authentication -> URL Configuration -> add your real
     domain as an allowed redirect URL
   - Lemon Squeezy webhook URL -> point at your real domain instead of
     ngrok

## Sharing it

Once everything above is checked off, you have a genuinely complete,
working product — real AI, real deterministic music theory, real
payments, real accounts. Share it with a few real guitarists for
feedback before pushing it more broadly — the original 10-week plan's
Day 50 goal, and the actual finish line of this whole build.
