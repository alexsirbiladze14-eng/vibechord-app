"use client";

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MODES = ["Major", "Minor", "Dorian", "Mixolydian"] as const;
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export type Mode = (typeof MODES)[number];
export type SkillLevel = (typeof SKILL_LEVELS)[number];

type Props = {
  vibe: string;
  onVibeChange: (v: string) => void;
  musicKey: string;
  onKeyChange: (k: string) => void;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  skill: SkillLevel;
  onSkillChange: (s: SkillLevel) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generateError: string | null;
};

export default function KeySelector({
  vibe,
  onVibeChange,
  musicKey,
  onKeyChange,
  mode,
  onModeChange,
  skill,
  onSkillChange,
  onGenerate,
  isGenerating,
  generateError,
}: Props) {
  return (
    <div className="rounded-lg border border-slate bg-rosewood/60 p-6 sm:p-8">
      <label
        htmlFor="vibe-input"
        className="block font-body text-sm text-ash mb-2"
      >
        Describe the song you're after
      </label>
      <input
        id="vibe-input"
        type="text"
        value={vibe}
        onChange={(e) => onVibeChange(e.target.value)}
        placeholder="e.g. sad indie rock, heavy grunge, dreamy bedroom pop..."
        className="w-full rounded-md border border-slate bg-rosewood px-4 py-3 font-body text-parchment placeholder:text-ash/60 focus:border-brass"
      />
      <p className="mt-2 text-xs text-ash">
        The AI reads this and picks a genre/mood/energy tag from a fixed
        list — it never invents chords itself. A real, curated progression
        is then selected to match, and mapped into whatever key you've
        picked below.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="key-select" className="block text-sm text-ash mb-2">
            Key
          </label>
          <select
            id="key-select"
            value={musicKey}
            onChange={(e) => onKeyChange(e.target.value)}
            className="w-full rounded-md border border-slate bg-rosewood px-3 py-2 font-body text-parchment focus:border-brass"
          >
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="mode-select"
            className="block text-sm text-ash mb-2"
          >
            Mode
          </label>
          <select
            id="mode-select"
            value={mode}
            onChange={(e) => onModeChange(e.target.value as Mode)}
            className="w-full rounded-md border border-slate bg-rosewood px-3 py-2 font-body text-parchment focus:border-brass"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ash">
            May auto-switch if a generated progression needs a different
            mode.
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm text-ash mb-2">Skill level</label>
          <div className="flex rounded-md border border-slate overflow-hidden">
            {SKILL_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onSkillChange(level)}
                aria-pressed={skill === level}
                className={`flex-1 px-2 py-2 text-xs font-body transition-colors ${
                  skill === level
                    ? "bg-brass text-rosewood font-medium"
                    : "bg-rosewood text-ash hover:text-parchment"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || !vibe.trim()}
        className="mt-6 w-full rounded-md bg-brass px-6 py-3 font-body font-medium text-rosewood transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isGenerating ? "Generating…" : "Generate progression"}
      </button>

      {generateError && (
        <p className="mt-2 text-xs text-rust">{generateError}</p>
      )}

      <p className="mt-6 text-xs text-ash">
        Everything below updates live as you change key or mode — that's
        Tonal.js doing real music-theory math, not a canned example.
      </p>
    </div>
  );
}
