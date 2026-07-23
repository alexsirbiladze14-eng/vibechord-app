import type { DiatonicChord } from "@/lib/musicTheory";

type Props = {
  chords: DiatonicChord[]; // pre-filtered to the active progression, if any
  allChords: DiatonicChord[];
  keyLabel: string;
  modeLabel: string;
  progressionName: string | null;
  source: "vibe" | "melody" | null;
  onReset: () => void;
};

export default function ChordCard({
  chords,
  allChords,
  keyLabel,
  modeLabel,
  progressionName,
  source,
  onReset,
}: Props) {
  const isFiltered = progressionName !== null;

  const subtitle =
    source === "melody"
      ? `Chords picked to harmonize with the melody you hummed, in ${keyLabel} ${modeLabel}.`
      : source === "vibe"
      ? `A real, curated progression in ${keyLabel} ${modeLabel}, matched to what you described.`
      : "Every chord that naturally belongs to this key, calculated from real interval math — not guessed.";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-display text-xl text-parchment">
          {isFiltered
            ? progressionName
            : `Diatonic chords in ${keyLabel} ${modeLabel}`}
        </h2>
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="font-mono text-[11px] text-ash underline decoration-ash/40 underline-offset-4 hover:text-parchment"
          >
            show all {allChords.length}
          </button>
        )}
      </div>
      <p className="text-sm text-ash mb-4">{subtitle}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chords.map((chord, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate bg-rosewood/60 px-4 py-5 text-center"
          >
            <div className="font-display text-3xl text-parchment">
              {chord.name}
            </div>
            <div className="mt-1 font-mono text-xs text-brass">
              {chord.degree}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
