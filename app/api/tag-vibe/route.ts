/**
 * /api/tag-vibe
 *
 * The ONLY place in this app that calls an AI model. Its job is narrow
 * and easy to verify: read the user's freeform vibe text, and classify
 * it into three fixed tags (genre, mood, energy) chosen from the exact
 * vocabulary in lib/progressions.ts.
 *
 * It does NOT pick chords, write theory explanations, or touch the
 * fretboard — all of that stays in the deterministic code from Weeks
 * 2-3. This route's whole output is three short strings.
 *
 * NOTE: this route needs a real Node server to run — it will NOT work
 * in the Capacitor/static-export build (see next.config.mjs / MOBILE.md).
 * That's expected and fine for the web version.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GENRES, MOODS, ENERGY_LEVELS } from "@/lib/progressions";
import { sanitizeTags } from "@/lib/selectProgression";

export async function POST(request: Request) {
  let vibe: string;
  try {
    const body = await request.json();
    vibe = typeof body.vibe === "string" ? body.vibe.trim() : "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!vibe) {
    return Response.json(
      { error: "Describe a vibe before generating." },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "No ANTHROPIC_API_KEY found. Copy .env.local.example to .env.local and add your key, then restart the dev server.",
      },
      { status: 500 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are classifying a short, freeform description of a song's vibe into exactly three fixed categories. Respond with ONLY a JSON object, no other text, no markdown code fences.

Pick exactly one value from each list below:

genre: ${JSON.stringify(GENRES)}
mood: ${JSON.stringify(MOODS)}
energy: ${JSON.stringify(ENERGY_LEVELS)}

Output format (nothing else):
{"genre": "...", "mood": "...", "energy": "..."}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system: systemPrompt,
      messages: [{ role: "user", content: vibe }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";

    // Defensive parse: strip markdown fences if the model adds them
    // despite instructions, then fall back to safe defaults on any
    // malformed or out-of-vocabulary response rather than crashing.
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    const tags = sanitizeTags(parsed);
    return Response.json(tags);
  } catch (err) {
    console.error("tag-vibe error:", err);
    return Response.json(
      { error: "Couldn't reach the AI service. Try again in a moment." },
      { status: 502 }
    );
  }
}
