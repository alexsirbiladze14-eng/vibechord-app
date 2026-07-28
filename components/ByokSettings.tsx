"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "vibechord_byok_key";

type Props = {
  onKeyChange: (key: string) => void;
};

export default function ByokSettings({ onKeyChange }: Props) {
  const [savedKey, setSavedKey] = useState("");
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);

  // Loaded from localStorage on mount — this key never touches any
  // server of ours except as a per-request field the AI routes read
  // and immediately hand to Anthropic; we never store it in Supabase
  // or anywhere else persistent on our side.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? "";
    setSavedKey(stored);
    onKeyChange(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    const trimmed = draft.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    setSavedKey(trimmed);
    onKeyChange(trimmed);
    setDraft("");
  }

  function handleClear() {
    localStorage.removeItem(STORAGE_KEY);
    setSavedKey("");
    onKeyChange("");
  }

  if (!expanded && !savedKey) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="font-mono text-xs text-ash underline decoration-ash/40 underline-offset-4 hover:text-parchment"
      >
        Have your own Anthropic API key? Use it instead of credits →
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate bg-rosewood/40 p-4">
      <p className="mb-2 font-mono text-xs text-ash">
        Bring your own Anthropic API key (optional)
      </p>

      {savedKey ? (
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-moss">
            Using your own key — credits aren't spent while this is active.
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="font-mono text-xs text-ash underline decoration-ash/40 underline-offset-4 hover:text-rust"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 rounded-md border border-slate bg-rosewood px-3 py-2 text-sm text-parchment placeholder:text-ash/60 focus:border-brass"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!draft.trim().startsWith("sk-ant-")}
            className="shrink-0 rounded-md bg-slate/60 px-4 py-2 text-sm text-parchment transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      )}

      <p className="mt-2 text-[11px] text-ash">
        Stored only in this browser (localStorage) — never saved to our
        database. Every AI action uses your key and your Anthropic quota
        instead of ours, so generating and refining won't spend your
        Vibechord credits while this is set.
      </p>
    </div>
  );
}
