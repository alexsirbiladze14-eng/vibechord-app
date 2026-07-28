/**
 * /api/refine
 *
 * Second (and last, for now) AI call in the app. Reads a freeform
 * refinement request ("make this darker", "give me something simpler")
 * and classifies it into exactly one of a fixed set of intents. The
 * actual transformation happens in lib/refine.ts — deterministic code,
 * no AI, using named, real music-theory techniques.
 */

import Anthropic from "@anthropic-ai/sdk";
import { REFINEMENT_INTENTS } from "@/lib/refine";
import {
  resolveApiKey,
  isUsingByok,
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/aiRouteHelpers";

export async function POST(request: Request) {
  let text: string;
  let byokKey: unknown;
  try {
    const body = await request.json();
    text = typeof body.request === "string" ? body.request.trim() : "";
    byokKey = body.byokKey;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!text) {
    return Response.json(
      { error: "Type a refinement request first." },
      { status: 400 }
    );
  }

  const usingByok = isUsingByok(byokKey);
  if (!checkRateLimit(getRateLimitKey(request), usingByok)) {
    return Response.json(
      { error: "Too many requests right now — wait a minute and try again." },
      { status: 429 }
    );
  }

  const apiKey = resolveApiKey(byokKey);
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

  const systemPrompt = `You are classifying a short request to change an existing chord progression, into exactly one fixed intent. Respond with ONLY a JSON object, no other text, no markdown fences.

Pick exactly one value from this list: ${JSON.stringify(REFINEMENT_INTENTS)}

Guidance:
- "darker", "sadder", "moodier" -> "darker"
- "brighter", "happier", "more uplifting" -> "brighter"
- "simpler", "easier", "fewer chords" -> "simpler"
- "more tension", "jazzier", "more interesting", "spicier" -> "tenser"
- "something else", "try again", "different one" -> "different"
- If genuinely unclear, default to "different"

Output format (nothing else):
{"intent": "..."}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    const intentRaw = (parsed as { intent?: string })?.intent;
    const intent = REFINEMENT_INTENTS.includes(intentRaw as never)
      ? intentRaw
      : "different"; // safe fallback if the AI returns something out-of-vocab

    return Response.json({ intent });
  } catch (err) {
    console.error("refine error:", err, usingByok ? "(byok)" : "(own key)");
    return Response.json(
      {
        error: usingByok
          ? "Couldn't reach the AI service with your key — double check it's valid and has available credit."
          : "Couldn't reach the AI service. Try again in a moment.",
      },
      { status: 502 }
    );
  }
}
