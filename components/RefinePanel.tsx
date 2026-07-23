"use client";

import { useState } from "react";

type Props = {
  onRefine: (request: string) => void;
  isRefining: boolean;
  refineError: string | null;
  refineMessage: string | null;
};

export default function RefinePanel({
  onRefine,
  isRefining,
  refineError,
  refineMessage,
}: Props) {
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onRefine(text);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate bg-rosewood/40 p-4"
    >
      <label htmlFor="refine-input" className="block text-xs text-ash mb-2">
        Not quite right? Ask for a change.
      </label>
      <div className="flex gap-2">
        <input
          id="refine-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. make this darker, simpler, more tension..."
          className="flex-1 rounded-md border border-slate bg-rosewood px-3 py-2 text-sm text-parchment placeholder:text-ash/60 focus:border-brass"
        />
        <button
          type="submit"
          disabled={isRefining || !text.trim()}
          className="shrink-0 rounded-md bg-slate/60 px-4 py-2 text-sm text-parchment transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRefining ? "…" : "Refine"}
        </button>
      </div>
      {refineError && <p className="mt-2 text-xs text-rust">{refineError}</p>}
      {refineMessage && (
        <p className="mt-2 text-xs text-ash">{refineMessage}</p>
      )}
    </form>
  );
}
