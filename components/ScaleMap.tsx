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

function fretX(fret: number) {
  return NECK_LEFT + fret * FRET_WIDTH - FRET_WIDTH / 2;
}

type Props = {
  positions: FretPosition[];
  rootNote: string;
  scaleLabel: string;
};

export default function ScaleMap({ positions, rootNote, scaleLabel }: Props) {
  const neckBottom = TOP + (STRINGS.length - 1) * ROW_HEIGHT;

  return (
    <div>
      <h2 className="font-display text-xl text-parchment mb-1">
        {scaleLabel}
      </h2>
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
          {/* fret wires */}
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

          {/* inlay markers */}
          {SINGLE_INLAYS.map((fret) => (
            <circle
              key={`inlay-${fret}`}
              cx={fretX(fret)}
              cy={neckBottom + 14}
              r={3}
              fill="#4A4534"
            />
          ))}
          {/* standard double-dot at the 12th fret */}
          <circle cx={fretX(DOUBLE_INLAY)} cy={neckBottom + 8} r={3} fill="#4A4534" />
          <circle cx={fretX(DOUBLE_INLAY)} cy={neckBottom + 20} r={3} fill="#4A4534" />

          {/* fret numbers, for orientation */}
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

          {/* strings, thickness = gauge, per the fretboard's own logic */}
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

          {/* highlighted scale notes, computed live from musicTheory.ts */}
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
