# Mobile app setup (Capacitor)

## The one thing you must understand before going further

**Update (Week 4): this is now handled automatically.** `next.config.mjs`
only forces a static export when you specifically run the `cap:*`
scripts (which set `CAPACITOR_BUILD=true`). Your normal `npm run dev`,
`npm run build`, and the Vercel deployment all run as a real server
with working API routes — you don't need to think about this further
unless you're actively rebuilding the mobile app.

The explanation below is kept for context on *why* this matters.

**Why:** Capacitor wraps a *static* export of your site (plain HTML/CSS/JS
files with no server behind them) inside a native shell. A static export
cannot run Next.js API routes (`app/api/.../route.ts`) — there's no
server present on the phone to run that code.

**What this means in practice:** any code that needs to call the
Anthropic/OpenAI API, or talk to Supabase/Stripe, cannot live inside
this mobile app's bundle when it's built for Capacitor. It has to live
on a real, always-on server somewhere on the internet, and the phone
app just sends it a normal `fetch()` request over the network — exactly
like any phone app talks to any API.

**The simple fix, now automated:** running `npm run dev` or
`npm run build` normally gives you a full server, API routes included
— use this for the web version and for local development. Running
`npm run cap:android` / `npm run cap:ios` builds a static-only export
specifically for the native shell — in that build, `/api/tag-vibe`
will not be reachable locally, so the phone app would need to point at
your deployed Vercel URL instead once you get to that stage. We'll
handle that connection explicitly when the mobile track resumes.

## Step-by-step: installing Capacitor

Run these in your project folder, in order:

```bash
npm install
npx cap init
```

(When prompted, app name: `Vibechord`, app ID: `com.vibechord.app` —
or just accept the values already set in `capacitor.config.ts`.)

```bash
npm run build
npx cap add android
npx cap add ios
```

This creates `android/` and `ios/` folders — real native projects.

## Building and testing on your phone

**Android (works on Windows, Mac, or Linux):**
1. Install Android Studio (free, from developer.android.com)
2. Run: `npm run cap:android`
3. Android Studio opens with your project loaded
4. Plug in an Android phone via USB (with USB debugging enabled in
   phone settings), or use the built-in emulator
5. Click the green Play/Run button in Android Studio

**iOS (Mac required — no way around this):**
1. Install Xcode from the Mac App Store (free)
2. Run: `npm run cap:ios`
3. Xcode opens with your project loaded
4. Select a simulator or plugged-in iPhone, click Run

## Every time you change your UI code

Capacitor doesn't auto-detect changes like `npm run dev` does. After
editing any component, re-sync with:

```bash
npm run cap:sync
```

Then re-run from Android Studio / Xcode to see the update on device.

## Microphone access (needed for Week 5's hum-a-riff feature)

When we reach Week 5, we'll install `@capacitor/microphone` or use
the standard Web Audio API `getUserMedia`, which Capacitor supports —
you'll also need to add a usage-description string in
`ios/App/App/Info.plist` (iOS requires explaining to the user why
you want mic access) and a permission entry in
`android/app/src/main/AndroidManifest.xml`. We'll do this together
when we get there — no need to touch it now.

## What's next

Once you can see the app running on an emulator or your own phone,
we're ready to keep going with Week 2 (wiring up the real Tonal.js
music engine) exactly as planned — that part is unaffected by any of
this, since it's pure UI-side JavaScript with no server involved.
