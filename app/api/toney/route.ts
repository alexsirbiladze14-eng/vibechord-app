/**
 * /api/toney
 *
 * Toney is a single conversational assistant that replaces three
 * previously-separate flows (vibe generation, refinement, and the new
 * tone-matching feature) with one chat. This route makes exactly ONE
 * AI call per message, asking it to classify which of four things the
 * user is doing, plus whatever narrow structured data that branch
 * needs.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GENRES, MOODS, ENERGY_LEVELS } from "@/lib/progressions";
import { REFINEMENT_INTENTS } from "@/lib/refine";
import { sanitizeQuizQuestions } from "@/lib/quiz";
import {
  resolveApiKey,
  isUsingByok,
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/aiRouteHelpers";

type ProgressionSummary = {
  name: string;
  chordNames: string[];
  keyLabel: string;
  modeLabel: string;
};

type ToneyRequestBody = {
  message: unknown;
  history: unknown;
  hasActiveProgression: unknown;
  activeProgressionSummary: unknown;
  currentKey: unknown;
  currentSkill: unknown;
  byokKey: unknown;
};

type HistoryTurn = { role: "user" | "assistant"; text: string };

function sanitizeHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is HistoryTurn =>
        typeof t === "object" &&
        t !== null &&
        (t.role === "user" || t.role === "assistant") &&
        typeof t.text === "string"
    )
    .slice(-10); // keep the prompt small — only recent context matters
}

export async function POST(request: Request) {
  let body: ToneyRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const history = sanitizeHistory(body.history);
  const hasActiveProgression = body.hasActiveProgression === true;
  const currentKey = typeof body.currentKey === "string" ? body.currentKey : null;
  const currentSkill = typeof body.currentSkill === "string" ? body.currentSkill : null;

  const summaryRaw = body.activeProgressionSummary as Partial<ProgressionSummary> | null;
  const progressionSummary: ProgressionSummary | null =
    summaryRaw &&
    typeof summaryRaw.name === "string" &&
    Array.isArray(summaryRaw.chordNames) &&
    typeof summaryRaw.keyLabel === "string" &&
    typeof summaryRaw.modeLabel === "string"
      ? {
          name: summaryRaw.name,
          chordNames: summaryRaw.chordNames.filter((c): c is string => typeof c === "string"),
          keyLabel: summaryRaw.keyLabel,
          modeLabel: summaryRaw.modeLabel,
        }
      : null;

  if (!message) {
    return Response.json({ error: "Say something to Toney first." }, { status: 400 });
  }

  const usingByok = isUsingByok(body.byokKey);
  if (!checkRateLimit(getRateLimitKey(request), usingByok)) {
    return Response.json(
      { error: "Too many requests right now — wait a minute and try again." },
      { status: 429 }
    );
  }

  const apiKey = resolveApiKey(body.byokKey);
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

  const historyText = history
    .map((t) => `${t.role === "user" ? "User" : "Toney"}: ${t.text}`)
    .join("\n");

  const systemPrompt = `You are Toney, a friendly, knowledgeable guitar-tone and songwriting assistant embedded in an app called Vibechord. You chat naturally, but your response is ALWAYS a single JSON object — never prose outside the JSON, never markdown fences.

Known so far this session: key = ${currentKey ?? "not yet given"}, skill level = ${currentSkill ?? "not yet given"}.

CRITICAL INSTRUCTION: If a user asks you to write a song, generate a chord progression, or create guitar tabs, and BOTH key and skill level are still unknown, set intent to "chat" and briefly, politely ask for both before generating anything. If the user's current message answers that question (mentions a key and/or skill level), extract it into the "key"/"skillLevel" fields below AND proceed with intent "generate" using it — don't ask again once they've told you.

Classify the user's latest message into exactly one intent:

- "generate": they want a new chord progression from a described vibe/mood, AND key + skill level are both known (either already established, or just given in this message)
- "refine": they want to CHANGE the progression currently showing (e.g. "make it darker", "simpler please", "add more tension"). Only valid if a progression is currently active — it currently is: ${hasActiveProgression}.
- "tone_match": they're asking how to get a specific tone — an artist, a song, an amp/pedal setup, or answering a follow-up about gear they own/don't own (e.g. "how do I get Metallica's One tone", "I don't have a Boss DS-1, what else works")
- "quiz": they want to be quizzed / tested on the progression currently showing (e.g. "quiz me", "test my theory knowledge on this"). Only valid if a progression is active — it currently is: ${hasActiveProgression}.${
    progressionSummary
      ? ` The active progression: "${progressionSummary.name}" — ${progressionSummary.chordNames.join(
          " - "
        )} in ${progressionSummary.keyLabel} ${progressionSummary.modeLabel}.`
      : ""
  }
- "chat": anything else — a question, a greeting, small talk, missing key/skill info, or something unclear

If intent is "quiz": generate between 1 and 5 short multiple-choice questions about THIS SPECIFIC progression (chord function, why it works emotionally, the theory behind a specific move) — default to 3 unless the user asked for a specific number, and clamp to the 1-5 range if they did. Each question needs exactly 3 answer options and the index (0, 1, or 2) of the correct one. Write them so they build on each other rather than repeating the same fact.

Separately from intent, ALWAYS check if the user's message mentions:
- A musical key (e.g. "in D minor", "key of G") — extract just the note name (C, C#, D, D#, E, F, F#, G, G#, A, A#, or B)
- Their skill level (e.g. "I'm a beginner", "I can play barre chords") — extract "Beginner", "Intermediate", or "Advanced"
Omit these fields if neither is mentioned in this message.

Respond with ONLY this JSON shape (include only the fields relevant to the chosen intent, omit the rest):
{
  "intent": "generate" | "refine" | "tone_match" | "quiz" | "chat",
  "genre": one of ${JSON.stringify(GENRES)} (only if intent is "generate"),
  "mood": one of ${JSON.stringify(MOODS)} (only if intent is "generate"),
  "energy": one of ${JSON.stringify(ENERGY_LEVELS)} (only if intent is "generate"),
  "refineIntent": one of ${JSON.stringify(REFINEMENT_INTENTS)} (only if intent is "refine"),
  "toneDescription": "2-4 sentences describing the real-world gear/settings (amp type, key pedals, EQ, pickup choice) historically associated with the requested tone or the closest substitute given the user's owned gear — factual and informational" (only if intent is "tone_match"),
  "tonePreset": { "label": "short name", "oscillatorType": "sine"|"triangle"|"sawtooth"|"square", "envelope": {"attack":n,"decay":n,"sustain":n,"release":n}, "effects": [ {"type":"distortion","amount":0-1} | {"type":"chorus","frequency":n,"delayTime":n,"depth":n} | {"type":"freeverb","roomSize":0-1,"dampening":n} | {"type":"tremolo","frequency":n,"depth":n} | {"type":"feedbackDelay","delayTime":n,"feedback":n} | {"type":"filter","frequency":n,"filterType":"lowpass"|"highpass"} ] } — an in-app approximation of that tone using ONLY these effect types (only if intent is "tone_match"),
  "toneFollowUpQuestion": "if the user hasn't said what gear they own yet, ask what they have available — otherwise null" (only if intent is "tone_match"),
  "key": "a note name, only if the user just mentioned a specific key",
  "skillLevel": "Beginner" | "Intermediate" | "Advanced" (only if the user just mentioned their skill level),
  "quizQuestions": [ { "question": "...", "options": ["...","...","..."], "correctIndex": 0 } ] — 1 to 5 of these (only if intent is "quiz"),
  "reply": "a short, warm, in-character reply from Toney — 1-2 sentences, conversational, never technical jargon dumped on the user"
}

Recent conversation:
${historyText}`;

  try {
    const message_ = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const textBlock = message_.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    // Same defensive discipline as every other AI-touched value in this
    // app: validate against the fixed vocabulary, drop anything that
    // doesn't match rather than passing an unvalidated guess through.
    const VALID_KEYS = [
      "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
    ];
    const VALID_SKILLS = ["Beginner", "Intermediate", "Advanced"];
    if (typeof parsed.key !== "string" || !VALID_KEYS.includes(parsed.key)) {
      delete parsed.key;
    }
    if (
      typeof parsed.skillLevel !== "string" ||
      !VALID_SKILLS.includes(parsed.skillLevel)
    ) {
      delete parsed.skillLevel;
    }
    if (parsed.quizQuestions !== undefined) {
      parsed.quizQuestions = sanitizeQuizQuestions(parsed.quizQuestions);
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("toney error:", err, usingByok ? "(byok)" : "(own key)");
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