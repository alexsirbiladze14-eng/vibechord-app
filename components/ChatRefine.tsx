"use client";

import { useEffect, useRef, useState } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isRefining: boolean;
};

export default function ChatRefine({ messages, onSend, isRefining }: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isRefining]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || isRefining) return;
    onSend(draft);
    setDraft("");
  }

  return (
    <div className="rounded-lg border border-slate bg-rosewood/40 p-4">
      <p className="mb-3 text-xs text-ash">
        Not quite right? Ask for a change — "make this darker," "simpler,"
        "more tension," "something different."
      </p>

      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-md bg-rosewood/60 p-3"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-brass text-rosewood"
                    : "bg-slate/50 text-parchment"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isRefining && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-slate/50 px-3 py-2 text-sm text-ash">
                Thinking…
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. make this darker..."
          className="flex-1 rounded-md border border-slate bg-rosewood px-3 py-2 text-sm text-parchment placeholder:text-ash/60 focus:border-brass"
        />
        <button
          type="submit"
          disabled={isRefining || !draft.trim()}
          className="shrink-0 rounded-md bg-slate/60 px-4 py-2 text-sm text-parchment transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
