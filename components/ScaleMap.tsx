"use client";

import { useEffect, useRef, useState } from "react";
import type { FretPosition } from "@/lib/musicTheory";

const STRINGS = [
  { label: "e", gauge: 1 },
  { label: "B", gauge: 1.3 },
  { label: "G", gauge: 1.8 },
  { label: "D", gauge: 2.4 },
  { label: "A", gauge: 3.1 },
  { label: "E", gauge: 4 },
];

const FRET_COUNT = 12;
const NECK_LEFT = 66;
const NECK_RIGHT = 610;
const FRET_WIDTH = (NECK_RIGHT - NECK_LEFT) / FRET_COUNT;
const ROW_HEIGHT = 32;
const TOP = 26;
const BOTTOM_LABEL_GAP = 22;

const SINGLE_INLAYS = [3, 5, 7, 9];
const DOUBLE_INLAY = 12;

const NOTE_INTERVAL_MS = 320;

function fretX(fret: number) {
  return NECK_LEFT + fret * FRET_WIDTH - FRET_WIDTH / 2;
}

type Props = {
  positions: FretPosition[];
  rootNote: string;
  scaleLabel: string;
  pentatonicNotes: string[]; // pitch classes in scale order, e.g. ["E","G","A","B","D"]
};

export default function ScaleMap({
  positions,
  rootNote,
  scaleLabel,
  pentatonicNotes,
}: Props) {
  const neckBottom = TOP + (STRINGS.length - 1) * ROW_HEIGHT;

  const [isPlaying, setIsPlaying] = useState(false);
  const toneRef = useRef<typeof import("tone") | null>(null);
  const synthRef = useRef<import("tone").Synth | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  function clearScheduled() {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }

  async function ensureSynth() {
    if (!toneRef.current) {
      toneRef.current = await import("tone");
    }
    if (!synthRef.current) {
      synthRef.current = new toneRef.current.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.25 },
      }).toDestination();
    }
    return { Tone: toneRef.current, synth: synthRef.current };
  }

  async function playScale() {
    if (pentatonicNotes.length === 0) return;
    const { Tone, synth } = await ensureSynth();
    await Tone.start();

    const sequence = [
      ...pentatonicNotes.map((n) => `${n}3`),
      `${pentatonicNotes[0]}4`,
    ];

    setIsPlaying(true);
    sequence.forEach((note, i) => {
      const id = window.setTimeout(() => {
        synth.triggerAttackRelease(note, NOTE_INTERVAL_MS * 0.85 * 0.001);
      }, i * NOTE_INTERVAL_MS);
      timeoutsRef.current.push(id);
    });
    const stopId = window.setTimeout(() => {
      setIsPlaying(false);
    }, sequence.length * NOTE_INTERVAL_MS);
    timeoutsRef.current.push(stopId);
  }

  function stopScale() {
    clearScheduled();
    synthRef.current?.triggerRelease();
    setIsPlaying(false);
  }

  useEffect(() => {
    return () => {
      clearScheduled();
      synthRef.current?.dispose();
    };
  }, []);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-display text-xl text-parchment">{scaleLabel}</h2>
        <button
          type="button"
          onClick={isPlaying ? stopScale : playScale}
          className="flex items-center gap-1.5 font-mono text-xs text-ash underline decoration-ash/40 underline-offset-4 hover:text-brass hover:decoration-brass"
        >
          {isPlaying ? "■ Stop" : "▶ Play scale"}
        </button>
      </div>
      <p className="text-sm text-ash mb-4">
        Brass dots mark the root note, {rootNote} — calculated across all
        12 frets on standard tuning.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate bg-rosewood/60 p-5">
        <svg
          viewBox={`0 0 640 ${neckBottom + BOTTOM_LABEL_GAP + 14}`}
          className="w-full min-w-[560px]"
          role="img"
          aria-label={`Guitar fretboard diagram showing ${scaleLabel}`}
        >
          {Array.from({ length: FRET_COUNT + 1 }).map((_, i) => (
            <line
              key={`fret-${i}`}
              x1={NECK_LEFT + i * FRET_WIDTH}
              x2={NECK_LEFT + i * FRET_WIDTH}
              y1={TOP}
              y2={neckBottom}
              stroke={i === 0 ? "#C98A4B" : "#4A4534"}
              strokeWidth={i === 0 ? 4 : 1.5}
              strokeLinecap="round"
            />
          ))}

          {SINGLE_INLAYS.map((fret) => (
            <circle
              key={`inlay-${fret}`}
              cx={fretX(fret)}
              cy={neckBottom + 14}
              r={3}
              fill="#4A4534"
            />
          ))}
          <circle cx={fretX(DOUBLE_INLAY)} cy={neckBottom + 8} r={3} fill="#4A4534" />
          <circle cx={fretX(DOUBLE_INLAY)} cy={neckBottom + 20} r={3} fill="#4A4534" />

          {[...SINGLE_INLAYS, DOUBLE_INLAY].map((fret) => (
            <text
              key={`num-${fret}`}
              x={fretX(fret)}
              y={neckBottom + BOTTOM_LABEL_GAP + 8}
              fill="#5C5644"
              fontFamily="var(--font-plex-mono)"
              fontSize={10}
              textAnchor="middle"
            >
              {fret}
            </text>
          ))}

          {STRINGS.map((s, i) => (
            <g key={s.label}>
              <line
                x1={NECK_LEFT}
                x2={NECK_RIGHT}
                y1={TOP + i * ROW_HEIGHT}
                y2={TOP + i * ROW_HEIGHT}
                stroke="#948C79"
                strokeWidth={s.gauge}
                strokeLinecap="round"
              />
              <text
                x={NECK_LEFT - 26}
                y={TOP + i * ROW_HEIGHT}
                fill="#B0A890"
                fontFamily="var(--font-plex-mono)"
                fontSize={13}
                fontWeight={500}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {s.label}
              </text>
            </g>
          ))}

          {positions.map((pos, i) => (
            <circle
              key={i}
              cx={pos.fret === 0 ? NECK_LEFT - 12 : fretX(pos.fret)}
              cy={TOP + pos.stringIndex * ROW_HEIGHT}
              r={pos.isRoot ? 9 : 7.5}
              fill={pos.isRoot ? "#C98A4B" : "#7C8B69"}
              stroke="#1B1712"
              strokeWidth={1.5}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
