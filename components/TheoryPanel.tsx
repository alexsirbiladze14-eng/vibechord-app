"use client";

import { useState } from "react";

type Quiz = {
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
};

type Props = {
  explanation: string | null;
  progressionName: string | null;
  source: "vibe" | "melody" | null;
  detail: string | null;
  chordNames: string[];
  keyLabel: string;
  modeLabel: string;
  onBeforeQuiz: () => Promise<{ ok: boolean; message?: string }>;
};

export default function TheoryPanel({
  explanation,
  progressionName,
  source,
  detail,
  chordNames,
  keyLabel,
  modeLabel,
  onBeforeQuiz,
}: Props) {
  const hasResult = explanation !== null;

  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const caption =
    source === "melody"
      ? `Built from the melody you hummed → ${progressionName}. This matching is rule-based (chord-tone overlap), not AI.`
      : source === "vibe" && detail
      ? `Matched to "${detail}" → ${progressionName}. This text comes from a human-curated database, not the AI — the AI's only job was classifying your vibe into a genre/mood/energy tag.`
      : null;

  async function handleQuizMe() {
    setQuizError(null);

    const spend = await onBeforeQuiz();
    if (!spend.ok) {
      setQuizError(spend.message ?? "Out of credits.");
      return;
    }

    setIsLoadingQuiz(true);
    setSelectedOption(null);

    try {
      const res = await fetch("/api/explain-theory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chordNames,
          key: keyLabel,
          mode: modeLabel,
          progressionName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setAiExplanation(data.explanation);
      setQuiz(data.quiz ?? null);
    } catch (err) {
      setQuizError(
        err instanceof Error ? err.message : "Couldn't generate — try again."
      );
    } finally {
      setIsLoadingQuiz(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate bg-rosewood/60 p-6">
      <h2 className="font-display text-xl text-parchment mb-3">
        Why this works{" "}
        <span className="text-ash text-xs font-body">
          {aiExplanation
            ? "(AI-written, personalized)"
            : hasResult
            ? "(curated, not AI-written)"
            : "(example)"}
        </span>
      </h2>

      {aiExplanation ? (
        <p className="font-body text-parchment/90 leading-relaxed">
          {aiExplanation}
        </p>
      ) : hasResult ? (
        <>
          <p className="font-body text-parchment/90 leading-relaxed">
            {explanation}
          </p>
          {caption && <p className="mt-3 text-xs text-ash">{caption}</p>}
        </>
      ) : (
        <p className="font-body text-parchment/90 leading-relaxed">
          This panel is a placeholder until you generate a progression
          above. For a taste: a progression like i–VI–III–VII (e.g.
          Em–C–G–D) gets its melancholy-but-hopeful pull from moving off
          the minor tonic into a major VI, then landing on VII instead of
          resolving home — which keeps it feeling unresolved rather than
          settled.
        </p>
      )}

      {quiz && (
        <div className="mt-5 rounded-md border border-slate bg-rosewood/60 p-4">
          <p className="mb-3 font-body text-sm text-parchment">
            {quiz.question}
          </p>
          <div className="space-y-2">
            {quiz.options.map((option, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === quiz.correctIndex;
              const showFeedback = selectedOption !== null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedOption(i)}
                  disabled={selectedOption !== null}
                  className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    showFeedback && isCorrect
                      ? "border-moss bg-moss/20 text-parchment"
                      : showFeedback && isSelected && !isCorrect
                      ? "border-rust bg-rust/20 text-parchment"
                      : "border-slate bg-rosewood text-ash hover:text-parchment"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {selectedOption !== null && (
            <p className="mt-3 text-xs text-ash">
              {selectedOption === quiz.correctIndex
                ? "Correct!"
                : `Not quite — the right answer is: "${quiz.options[quiz.correctIndex]}"`}
            </p>
          )}
        </div>
      )}

      {quizError && <p className="mt-3 text-xs text-rust">{quizError}</p>}

      {hasResult && !aiExplanation && (
        <button
          type="button"
          onClick={handleQuizMe}
          disabled={isLoadingQuiz}
          className="mt-4 font-body text-sm text-brass underline decoration-brass/40 underline-offset-4 hover:decoration-brass disabled:opacity-50"
        >
          {isLoadingQuiz ? "Thinking…" : "Quiz me on this →"}
        </button>
      )}
    </div>
  );
}
