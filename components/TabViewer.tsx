"use client";

import { useState } from "react";
import type { DiatonicChord } from "@/lib/musicTheory";
import {
  pickVoicings,
  mutingNote,
  type Difficulty,
  type SkillLevel,
  type ChordVoicing,
} from "@/lib/chordShapes";

const STRING_LABELS = ["E", "A", "D", "G", "B", "e"];
const STRING_GAUGES = [3.2, 2.6, 2, 1.5, 1.1, 0.8];

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  open: "#7C8B69",
  barre: "#C98A4B",
  extended: "#B5533C",
};

const FRET_ROWS = 4;
const COL_GAP = 22;
const LEFT = 24;
const TOP_MARKERS = 14;
const NUT_Y = 30;
const ROW_H = 26;
const DIAGRAM_W = LEFT * 2 + COL_GAP * 5;
const DIAGRAM_H = NUT_Y + FRET_ROWS * ROW_H + 26;

function stringX(i: number) {
  return LEFT + i * COL_GAP;
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous voicing" : "Next voicing"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate bg-rosewood text-ash transition-colors hover:border-brass hover:text-brass"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {direction === "prev" ? (
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

function ChordDiagram({
  chordName,
  skill,
}: {
  chordName: string;
  skill: SkillLevel;
}) {
  const { primary, alternates } = pickVoicings(chordName, skill);
  const options: ChordVoicing[] = [primary, ...alternates];
  const [selected, setSelected] = useState(0);
  const voicing = options[selected] ?? primary;

  const hasOpenString = voicing.frets.includes(0);
  const startFret = hasOpenString ? 1 : voicing.baseFret;
  const showNut = hasOpenString;
  const color = DIFFICULTY_COLOR[voicing.difficulty];
  const muteText = mutingNote(voicing.mutedStrings); // used for aria-label only

  function prevVoicing() {
    setSelected((i) => (i - 1 + options.length) % options.length);
  }
  function nextVoicing() {
    setSelected((i) => (i + 1) % options.length);
  }

  return (
    <div className="rounded-xl border border-slate bg-gradient-to-b from-rosewood/80 to-rosewood/40 p-4">
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-display text-2xl text-parchment">
          {chordName}
        </span>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
          style={{ color, backgroundColor: `${color}22` }}
        >
          {voicing.badge}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {options.length > 1 && (
          <ArrowButton direction="prev" onClick={prevVoicing} />
        )}

        <svg
          viewBox={`0 0 ${DIAGRAM_W} ${DIAGRAM_H}`}
          className="w-full"
          role="img"
          aria-label={`${chordName} chord diagram, ${voicing.label} voicing${
            muteText ? `. ${muteText}` : ""
          }`}
        >
          {voicing.frets.map((f, i) => {
            const x = stringX(i);
            if (f === 0) {
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={TOP_MARKERS}
                  r={4.5}
                  fill="none"
                  stroke="#948C79"
                  strokeWidth={1.3}
                />
              );
            }
            if (f === null) {
              return (
                <g key={i} stroke="#B5533C" strokeWidth={1.6}>
                  <line x1={x - 4} y1={TOP_MARKERS - 4} x2={x + 4} y2={TOP_MARKERS + 4} />
                  <line x1={x - 4} y1={TOP_MARKERS + 4} x2={x + 4} y2={TOP_MARKERS - 4} />
                </g>
              );
            }
            return null;
          })}

          {showNut ? (
            <rect
              x={LEFT - 2}
              y={NUT_Y - 3}
              width={DIAGRAM_W - (LEFT - 2) * 2}
              height={4}
              rx={1.5}
              fill="#EDE6D6"
            />
          ) : (
            <>
              <line
                x1={LEFT}
                y1={NUT_Y}
                x2={DIAGRAM_W - LEFT}
                y2={NUT_Y}
                stroke="#3A362C"
                strokeWidth={1.5}
              />
              <text
                x={LEFT - 12}
                y={NUT_Y + ROW_H / 2}
                fill="#C98A4B"
                fontFamily="var(--font-plex-mono)"
                fontSize={10}
                textAnchor="end"
                dominantBaseline="central"
              >
                {startFret}fr
              </text>
            </>
          )}

          {Array.from({ length: FRET_ROWS + 1 }).map((_, i) => (
            <line
              key={`fret-${i}`}
              x1={LEFT}
              x2={DIAGRAM_W - LEFT}
              y1={NUT_Y + i * ROW_H}
              y2={NUT_Y + i * ROW_H}
              stroke="#3A362C"
              strokeWidth={1}
            />
          ))}

          {STRING_GAUGES.map((gauge, i) => (
            <line
              key={`string-${i}`}
              x1={stringX(i)}
              x2={stringX(i)}
              y1={NUT_Y}
              y2={NUT_Y + FRET_ROWS * ROW_H}
              stroke={voicing.frets[i] === null ? "#332F26" : "#5C5644"}
              strokeWidth={gauge}
            />
          ))}

          {voicing.frets.map((f, i) => {
            if (f === null || f === 0) return null;
            const rowIdx = f - startFret;
            if (rowIdx < 0 || rowIdx >= FRET_ROWS) return null;
            return (
              <circle
                key={`dot-${i}`}
                cx={stringX(i)}
                cy={NUT_Y + rowIdx * ROW_H + ROW_H / 2}
                r={8}
                fill={color}
                stroke="#1B1712"
                strokeWidth={1.5}
              />
            );
          })}

          {STRING_LABELS.map((label, i) => (
            <text
              key={label}
              x={stringX(i)}
              y={NUT_Y + FRET_ROWS * ROW_H + 18}
              fill={voicing.frets[i] === null ? "#5C5644" : "#948C79"}
              fontFamily="var(--font-plex-mono)"
              fontSize={11}
              textAnchor="middle"
            >
              {label}
            </text>
          ))}
        </svg>

        {options.length > 1 && (
          <ArrowButton direction="next" onClick={nextVoicing} />
        )}
      </div>

      {options.length > 1 && (
        <p className="mt-2 text-center font-mono text-[10px] text-ash">
          {voicing.label}
          {voicing.badge !== "open" ? ` ${voicing.baseFret}fr` : ""} ·{" "}
          {selected + 1}/{options.length}
        </p>
      )}
    </div>
  );
}

type Props = {
  chords: DiatonicChord[];
  skill: SkillLevel;
};

export default function TabViewer({ chords, skill }: Props) {
  return (
    <div>
      <h2 className="font-display text-xl text-parchment mb-1">Tabs</h2>
      <p className="text-sm text-ash mb-4">
        Shapes chosen for a {skill.toLowerCase()} player. Use the side
        arrows to browse other ways to play each chord.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chords.map((chord, i) => (
          <ChordDiagram
            key={`${chord.name}-${skill}-${i}`}
            chordName={chord.name}
            skill={skill}
          />
        ))}
      </div>
    </div>
  );
}
