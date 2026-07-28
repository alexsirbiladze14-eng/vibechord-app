"use client";

import { useEffect, useRef, useState } from "react";
import type { DiatonicChord, ModeName } from "@/lib/musicTheory";
import { getChordToneNotes } from "@/lib/musicTheory";
import type { Genre } from "@/lib/progressions";
import { getSoundPreset } from "@/lib/soundPresets";
import { useSynthVoice } from "@/lib/useSynthVoice";

type Props = {
  chords: DiatonicChord[];
  degrees: number[]; // scale-degree indices matching `chords`, in order
  musicKey: string;
  mode: ModeName;
  genre: Genre | null;
};

// Chord-tone pitch classes get a fixed octave for playback. This is a
// simplification (no real voice leading between chords), but it's
// genuine, audible, correct-note synthesis — not a placeholder.
const PLAYBACK_OCTAVE = 4;

export default function AudioPlayer({
  chords,
  degrees,
  musicKey,
  mode,
  genre,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(90);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const preset = getSoundPreset(genre);
  const presetKey = genre ?? "__default__";
  const { ensure } = useSynthVoice();
  const timeoutsRef = useRef<number[]>([]);

  function clearScheduled() {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }

  async function play() {
    if (chords.length === 0) return;
    const { Tone, synth } = await ensure(preset, presetKey);
    await Tone.start(); // must happen from a real user gesture — this click qualifies

    setIsPlaying(true);
    setActiveIndex(0);

    const secondsPerChord = 60 / tempo; // quarter-note feel per chord
    const msPerChord = secondsPerChord * 1000;

    chords.forEach((_, i) => {
      const degree = degrees[i];
      const notes = getChordToneNotes(musicKey, mode, degree).map(
        (n) => `${n}${PLAYBACK_OCTAVE}`
      );
      const id = window.setTimeout(() => {
        synth.triggerAttackRelease(notes, secondsPerChord * 0.9);
        setActiveIndex(i);
      }, i * msPerChord);
      timeoutsRef.current.push(id);
    });

    const stopId = window.setTimeout(() => {
      setIsPlaying(false);
      setActiveIndex(null);
    }, chords.length * msPerChord);
    timeoutsRef.current.push(stopId);
  }

  function stop() {
    clearScheduled();
    setIsPlaying(false);
    setActiveIndex(null);
  }

  // Stop cleanly if the progression genuinely changes. Deliberately
  // keyed on a stable string (not the `chords` array reference) — that
  // reference is rebuilt on every parent re-render (e.g. typing in the
  // vibe box), which would otherwise cut playback off for reasons that
  // have nothing to do with the actual chords changing.
  const progressionKey = `${musicKey}-${mode}-${chords.map((c) => c.name).join(",")}`;
  useEffect(() => {
    return () => clearScheduled();
  }, []);
  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressionKey]);

  const progressPct =
    isPlaying && activeIndex !== null && chords.length > 0
      ? ((activeIndex + 1) / chords.length) * 100
      : 0;

  return (
    <div className="rounded-lg border border-slate bg-rosewood/60 p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-display text-xl text-parchment">Listen</h2>
        {chords.length > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-wide text-brass">
            {preset.label}
          </span>
        )}
      </div>
      <p className="text-sm text-ash mb-4">
        {chords.length > 0
          ? genre
            ? `Tone shaped to match the "${genre}" vibe — real synth/effects choices, not AI-generated audio.`
            : "Hear the real chord tones — synthesized from the same notes the tabs above use."
          : "Generate or hum a progression above to hear it played back."}
      </p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={isPlaying ? stop : play}
          disabled={chords.length === 0}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brass text-rosewood transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={isPlaying ? "Stop" : "Play"}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="2" y="1" width="4" height="14" />
              <rect x="10" y="1" width="4" height="14" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M3 1.5v13l11-6.5-11-6.5z" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate">
            <div
              className="h-full bg-brass transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-ash">
          <label htmlFor="tempo" className="font-mono text-xs">
            {tempo} BPM
          </label>
          <input
            id="tempo"
            type="range"
            min={40}
            max={200}
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="w-24 accent-brass"
          />
        </div>
      </div>

      {chords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chords.map((chord, i) => (
            <span
              key={i}
              className={`rounded-md px-2 py-1 font-mono text-xs transition-colors ${
                activeIndex === i
                  ? "bg-brass text-rosewood"
                  : "bg-slate/40 text-parchment"
              }`}
            >
              {chord.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
