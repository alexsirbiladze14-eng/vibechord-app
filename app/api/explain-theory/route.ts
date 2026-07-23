/**
 * /api/explain-theory
 *
 * Week 8's AI call. Given a progression that's ALREADY been decided by
 * deterministic code (Weeks 2-6), the AI writes a personalized 2-3
 * sentence explanation and one short quiz question about it.
 *
 * Important boundary, same as every other AI call in this app: the AI
 * never chooses or invents a chord here — it only receives the chord
 * names as already-decided facts and writes prose/quiz text about them.
 */

import Anthropic from "@anthropic-ai/sdk";

type ExplainBody = {
  chordNames: unknown;
  key: unknown;
  mode: unknown;
  progressionName: unknown;
};

type QuizShape = {
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
};

function sanitizeQuiz(raw: unknown): QuizShape | null {
  if (typeof raw !== "object" || raw === null) return null;
  const q = raw as { question?: unknown; options?: unknown; correctIndex?: unknown };
  if (typeof q.question !== "string" || !q.question.trim()) return null;
  if (!Array.isArray(q.options) || q.options.length !== 3) return null;
  if (!q.options.every((o) => typeof o === "string" && o.trim())) return null;
  if (typeof q.correctIndex !== "number" || ![0, 1, 2].includes(q.correctIndex)) {
    return null;
  }
  return {
    question: q.question,
    options: q.options as [string, string, string],
    correctIndex: q.correctIndex as 0 | 1 | 2,
  };
}

export async function POST(request: Request) {
  let body: ExplainBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const chordNames = Array.isArray(body.chordNames)
    ? (body.chordNames as unknown[]).filter((c) => typeof c === "string")
    : [];
  const key = typeof body.key === "string" ? body.key : "";
  const mode = typeof body.mode === "string" ? body.mode : "";
  const progressionName =
    typeof body.progressionName === "string" ? body.progressionName : "";

  if (chordNames.length === 0 || !key || !mode) {
    return Response.json(
      { error: "Missing chord progression, key, or mode." },
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

  const systemPrompt = `You are a friendly, knowledgeable music theory tutor talking to a guitarist. You will be given a chord progression that has ALREADY been chosen — you are not selecting or inventing chords, only writing about the ones given.

Progression: ${chordNames.join(" - ")}
Key/mode: ${key} ${mode}
Progression name: ${progressionName || "this progression"}

Write:
1. A warm, specific, 2-3 sentence explanation of why this progression works — its emotional character and the theory behind it (e.g. tension/resolution, borrowed chords, cadences). Be concrete about THESE chords, not generic.
2. One short multiple-choice quiz question testing understanding of this specific progression, with exactly 3 answer options and the index (0, 1, or 2) of the correct one.

Respond with ONLY a JSON object, no other text, no markdown fences:
{"explanation": "...", "quiz": {"question": "...", "options": ["...", "...", "..."], "correctIndex": 0}}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: "user", content: "Explain this progression and quiz me." },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed: { explanation?: unknown; quiz?: unknown } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    const explanation =
      typeof parsed.explanation === "string" && parsed.explanation.trim()
        ? parsed.explanation.trim()
        : null;
    const quiz = sanitizeQuiz(parsed.quiz);

    if (!explanation) {
      return Response.json(
        { error: "Couldn't generate an explanation — try again." },
        { status: 502 }
      );
    }

    return Response.json({ explanation, quiz });
  } catch (err) {
    console.error("explain-theory error:", err);
    return Response.json(
      { error: "Couldn't reach the AI service. Try again in a moment." },
      { status: 502 }
    );
  }
}
