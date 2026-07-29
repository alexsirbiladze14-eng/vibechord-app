"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import type { QuizQuestion } from "@/lib/quiz";

type Props = {
  questions: QuizQuestion[];
  onFinish: () => void;
};

export default function QuizWidget({ questions, onFinish }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isDone = currentIndex >= questions.length;

  function handleSelect(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
    if (optionIndex === current.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  }

  function handleNext() {
    setSelected(null);
    setCurrentIndex((i) => i + 1);
  }

  if (isDone) {
    return (
      <div className="rounded-lg border border-brass/40 bg-slate/10 p-6 text-center">
        <Sparkles className="mx-auto mb-2 text-brass" size={24} />
        <h3 className="font-display text-lg text-parchment">
          {correctCount}/{questions.length} correct
        </h3>
        <p className="mt-1 text-sm text-ash">
          {correctCount === questions.length
            ? "Perfect score — nice work!"
            : "Nice effort — ask for another quiz any time."}
        </p>
        <button
          type="button"
          onClick={onFinish}
          className="mt-4 rounded-md bg-brass px-4 py-2 text-sm font-medium text-rosewood transition-opacity hover:opacity-90"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brass/40 bg-slate/10 p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-brass">
          Question {currentIndex + 1}/{questions.length}
        </span>
        <button
          type="button"
          onClick={onFinish}
          className="text-ash transition-colors hover:text-parchment"
          aria-label="Close quiz"
        >
          <X size={16} />
        </button>
      </div>

      <p className="mb-4 font-body text-parchment">{current.question}</p>

      <div className="space-y-2">
        {current.options.map((option, i) => {
          const isCorrect = i === current.correctIndex;
          const isChosen = i === selected;
          const showFeedback = selected !== null;

          let style = "border-slate bg-rosewood text-parchment hover:border-brass/50";
          if (showFeedback && isCorrect) {
            style = "border-moss bg-moss/10 text-parchment";
          } else if (showFeedback && isChosen && !isCorrect) {
            style = "border-rust bg-rust/10 text-parchment";
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={showFeedback}
              className={`block w-full rounded-md border p-3 text-left text-sm transition-colors ${style} ${
                showFeedback ? "cursor-default" : "cursor-pointer"
              }`}
            >
              {["A", "B", "C"][i]}) {option}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <button
          type="button"
          onClick={handleNext}
          className="mt-4 rounded-md bg-brass px-4 py-2 text-sm font-medium text-rosewood transition-opacity hover:opacity-90"
        >
          {isLast ? "See results" : "Next question"}
        </button>
      )}
    </div>
  );
}