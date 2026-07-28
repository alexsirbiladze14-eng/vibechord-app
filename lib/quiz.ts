/**
 * quiz.ts
 *
 * Validates AI-generated quiz questions before they're ever shown or
 * scored — same defensive discipline as every other structured AI
 * output in this app (sanitizeTags, sanitizePreset, etc.).
 */

export type QuizQuestion = {
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
};

export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 5;

function sanitizeOne(raw: unknown): QuizQuestion | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as { question?: unknown; options?: unknown; correctIndex?: unknown };
  if (typeof r.question !== "string" || !r.question.trim()) return null;
  if (!Array.isArray(r.options) || r.options.length !== 3) return null;
  if (!r.options.every((o) => typeof o === "string" && o.trim())) return null;
  if (typeof r.correctIndex !== "number" || ![0, 1, 2].includes(r.correctIndex)) {
    return null;
  }
  return {
    question: r.question.trim(),
    options: r.options as [string, string, string],
    correctIndex: r.correctIndex as 0 | 1 | 2,
  };
}

export function sanitizeQuizQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeOne)
    .filter((q): q is QuizQuestion => q !== null)
    .slice(0, MAX_QUESTIONS);
}