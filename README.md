# Vibechord

Turn a vibe into a song you can actually play — real chord progressions,
scale maps, and skill-appropriate tabs, built on a hybrid architecture
where AI handles taste and creativity, and deterministic code handles
every piece of actual music math (so it never hallucinates a chord shape
a human hand can't play).

## Status: Week 1–10 complete — the full original plan is built

**Weeks 1–9** — full UI, real music theory engine, chord/tab
dictionary, AI vibe interpreter, hum-a-riff, chat-style refinement,
real audio playback, AI-personalized theory + quiz, and accounts +
saved songs + real billing via Lemon Squeezy.

**Week 10** — the final week: BYOK, basic cost/abuse protection, and
launch prep. See **LAUNCH.md** for the full end-to-end test checklist
and the go-live steps only you can do (domain, switching Lemon Squeezy
out of test mode).

- **BYOK** (`ByokSettings.tsx`) — anyone can paste their own Anthropic
  API key. It's stored ONLY in their browser (localStorage), never in
  Supabase, and is sent only as a per-request field the AI routes hand
  directly to Anthropic. While set, generating, refining, and the quiz
  all use the user's own key and quota — Vibechord credits aren't
  spent at all. Verified: the key-resolution logic correctly falls
  back to your own key if the pasted value doesn't look like a real
  Anthropic key, rather than silently failing.
- **Rate limiting** (`lib/aiRouteHelpers.ts`) — caps requests against
  YOUR OWN key at 20/minute per IP, protecting your API costs from a
  runaway bug or bot. BYOK requests are exempt, since those spend the
  user's own quota, not yours. Verified with a simulated burst of 25
  rapid requests: exactly 20 allowed, 5 blocked, while 25 BYOK
  requests in the same test were never limited.

This completes the original 10-week plan in full: static UI → real
music theory engine → chord/tab dictionary → AI vibe interpreter →
hum-a-riff → iterative refinement → audio playback → AI theory/quiz →
accounts and billing → BYOK and launch readiness.

## Bonus: real plucked-string tone + genre-shaped effects

Playback uses **Tone.PluckSynth** — a physically-modeled plucked
string (Karplus-Strong synthesis), not a generic oscillator — so it
actually sounds like a plucked string rather than a synth pad. Since
`PluckSynth` is monophonic and can't be wrapped in Tone's `PolySynth`
(confirmed against Tone.js's own GitHub issue #1074), chords are
played by round-robining each note across a small pool of 8
independent `PluckSynth` voices instead.

`lib/soundPresets.ts` maps the genre already classified by
`/api/tag-vibe` (Week 4 — this adds no new AI call) to that voice's
real parameters — `attackNoise` (pick hardness), `dampening`
(brightness), `resonance` (how long the string rings, deliberately
LOW for metal/punk's palm-muted choke rather than high, matching how
real palm-muting actually works) — plus a Tone.js effects chain on
top: heavy Distortion for metal/punk, light Distortion + Tremolo for
blues (classic amp tremolo), Chorus for indie (the jangly indie-guitar
sound) and jazz-influenced, Chorus + a low-pass Filter for lo-fi
(muffled tape feel), and clean Freeverb-only tones for pop/ballad/folk.
Humming a riff (no AI classification exists there) and the
pre-generation default both get Tone.PluckSynth's own natural,
characterless defaults.

Verified before shipping: every one of the 10 genres in
`lib/progressions.ts`'s `GENRES` list has a matching preset entry, and
every effect type referenced is one of the 6 implemented (Distortion,
Chorus, Freeverb, Tremolo, FeedbackDelay, Filter) — checked with a
small script rather than assumed. The current sound's label (e.g.
"Distorted, palm-muted") is shown directly in the Listen panel, so the
choice is visible, not hidden.

## Bonus: generation respects your selected mode

`selectProgression()` now takes the currently-selected mode as a
preference: if a curated progression in THAT mode has any real overlap
with the classified vibe tags, it wins and the mode dropdown stays put
— it only auto-switches when nothing in the current mode matches the
vibe even a little. Verified against the real progression database:
a rock/playful/high-energy vibe now correctly stays in Mixolydian
(previously it always switched to whichever mode scored globally
best, ignoring the user's own selection). Honest limitation: Dorian
and Mixolydian each have only one curated progression in the current
13-entry database, so a vibe has to roughly match that specific
entry's tags to stay in those modes — otherwise switching is still the
right call, not a bug.
"Distorted, palm-muted") is shown directly in the Listen panel, so the
choice is visible, not hidden.

**Week 9** — accounts, saved songs, and real billing. This is the
first week that needs services beyond this codebase — a Supabase
project and a Lemon Squeezy store, both of which only you can create.
See **BILLING.md** for the exact setup steps; everything else is built:

- `AuthPanel.tsx` — email/password sign up, log in, log out via
  Supabase Auth
- `SavedSongs.tsx` — save the current progression, load or delete
  past ones, all protected by Postgres Row Level Security so a user
  can only ever touch their own rows
- Credit system — every account starts with 10 free credits.
  Generating a vibe progression or asking for a refinement spends
  exactly 1, via an atomic `spend_credit()` database function (so two
  rapid clicks can't both succeed and go negative). **Guests (not
  logged in) get unlimited local generation** — a deliberate "try
  before you sign up" choice, documented in `page.tsx`
- `PricingPanel.tsx` + `/api/checkout` — real Lemon Squeezy Checkout
  for 2 subscription tiers and 3 one-time credit packs. (Originally
  built on Stripe, then switched — Stripe doesn't support opening a
  merchant account from Georgia. Lemon Squeezy is a Merchant of Record
  supporting sellers in far more countries, and is itself owned by
  Stripe.)
- `/api/lemonsqueezy-webhook` — verifies Lemon Squeezy's HMAC
  signature, credits the right account (matched via custom_data
  carried through the checkout), handles both first payment and
  monthly renewals via a single `subscription_payment_success` event,
  and guards against duplicate delivery by hashing the request body
  (documented in the route's code — Lemon Squeezy doesn't expose a
  stable per-event id the way Stripe did)

Notably: **humming a riff still costs nothing** — it was never an AI
call (see Week 5), so it was never gated behind credits either. Same
now applies to anyone using their own BYOK key (Week 10) — those
requests spend their quota, not yours or the shared credit pool.

## How to test Week 9

Follow BILLING.md first (Supabase + Lemon Squeezy setup), then:
- Sign up with a real-ish email — you should land at 10 credits
- Generate a progression a few times — credits should count down by
  exactly 1 each time
- Save a progression, refresh the page, confirm it's still listed and
  loads correctly
- Try a test-mode Lemon Squeezy purchase (`4242 4242 4242 4242`) —
  credits should increase within a few seconds of completing checkout
  (keep your ngrok tunnel running if testing locally)
- Log out — the app should still work (unlimited generation), just
  without saved songs or credit tracking

## How to test Weeks 6-8

- Generate or hum a progression, then in the chat box type "make this
  darker" — your message and the response should both appear as chat
  bubbles, and the chords/mode should update
- Follow up with "simpler" or "more tension" in the same conversation —
  should keep chatting rather than resetting
- Hit play in "Listen" — you should hear actual chords, with the
  currently-playing one highlighted; drag the tempo slider and replay
  to hear the speed change
- Click "Quiz me on this" — after a moment, the explanation should
  become specific to your exact progression, tagged "(AI-written,
  personalized)", with a multiple-choice question underneath
- Generate a NEW progression afterward — the quiz should NOT linger
  from the previous one

## Running it locally

You'll need Node.js 20+ installed. Then, in this folder:

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you should see the full mock UI.

## Pushing to GitHub (Day 1 task, do this on your machine)

```bash
git init
git add .
git commit -m "Week 1: static UI shell"
```

Then create a new repo on github.com, and follow GitHub's instructions
to push an existing local repo (it'll give you the exact `git remote
add` and `git push` commands for your new repo URL).

## Deploying to Vercel (Day 4 task)

1. Go to vercel.com, sign up/log in with your GitHub account
2. Click "Add New Project," select this repo
3. Leave all settings as default (Vercel auto-detects Next.js) and
   click Deploy
4. You'll get a live `your-project.vercel.app` URL within a minute or two

## Design notes

Palette (named, not defaults):
- `rosewood` #1B1712 — background, like a fretboard under warm light
- `parchment` #EDE6D6 — primary text, aged sheet-music cream
- `brass` #C98A4B — primary accent, tuning-peg copper
- `moss` #7C8B69 — secondary highlight (non-root scale notes)
- `rust` #B5533C — reserved for errors/alerts (not yet used)
- `slate` #3A362C — borders and dividers
- `ash` #948C79 — secondary/muted text

Type: Fraunces (display, italic used for emphasis) + Inter (body) +
IBM Plex Mono (tab grids and fret numbers — chosen because tab notation
is inherently a monospace grid, so the utility face does double duty as
a thematic choice).

Signature element: the `.string` divider classes in `globals.css`
render horizontal rules whose thickness mimics real guitar string
gauges (thick low-E down to thin high-E), used between the input and
results sections instead of a generic hairline rule.

## Installing it on your phone (PWA)

This app is now a Progressive Web App — installable straight from the
browser, no App Store needed.

1. Deploy it to Vercel (see above) so it has a real `https://` URL —
   phones won't install PWAs from `localhost`
2. On your phone, open that URL in the browser
   - **iPhone (Safari):** tap the Share icon → "Add to Home Screen"
   - **Android (Chrome):** tap the ⋮ menu → "Install app" (or you'll
     see an automatic install banner)
3. It now appears on your home screen with the brass "V" icon, opens
   full-screen with no browser bar, and caches the app shell for
   basic offline access

## Later: a real App Store / Play Store app

Once the product is feature-complete (past Week 9–10 of the build
plan), wrap this same codebase with **Capacitor**
(capacitorjs.com) to ship an actual native iOS/Android app without a
rewrite. That's a distinct, later step — no need to do it on a mock UI.

## Turning this into a phone app

See `MOBILE.md` — it covers installing Capacitor, building for
Android and iOS, and an important architecture note about how the
AI/backend calls (Week 4+) need to be split from the app bundle
itself once we go this route.

## Next steps (Week 2 of the build plan)

- `npm install tonal` is already in package.json — install will pull it
- Replace the hardcoded data in `ChordCard.tsx`, `ScaleMap.tsx`, and
  `TabViewer.tsx` with real output from a new `lib/musicTheory.ts`
  built on Tonal.js
- See the full week-by-week plan in `ai-guitar-app-build-plan.txt`
  from earlier in this project for Days 6–50
