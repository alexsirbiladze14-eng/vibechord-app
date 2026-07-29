/**
 * musicTheory.ts
 *
 * This is the "deterministic layer" from the hybrid architecture: pure,
 * exact music math, with zero AI involved. Nothing in this file guesses
 * or generates creatively — given the same key/mode, it always returns
 * the same, correct answer. This is what protects the app from ever
 * showing a hallucinated chord or an impossible fingering.
 *
 * Built on Tonal.js (https://github.com/tonaljs/tonal).
 */

import { Scale, Note } from "tonal";

export type ModeName = "major" | "minor" | "dorian" | "mixolydian";

export type ChordQuality = "major" | "minor" | "diminished";

export type DiatonicChord = {
  name: string; // clean, predictable format: "C", "Dm", "Bdim" — never "CM" or similar
  degree: string; // roman numeral, cased by quality: "I", "ii", "vii°"
  quality: ChordQuality;
};

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

// Which chord quality naturally falls on each scale degree, for each mode.
// This is standard, settled music theory — not something to guess at per
// key, so it's a fixed lookup table rather than computed per chord.
const MODE_QUALITIES: Record<ModeName, ChordQuality[]> = {
  major: ["major", "minor", "minor", "major", "major", "minor", "diminished"],
  minor: ["minor", "diminished", "major", "minor", "minor", "major", "major"],
  dorian: ["minor", "minor", "major", "major", "minor", "diminished", "major"],
  mixolydian: ["major", "minor", "diminished", "major", "minor", "minor", "major"],
};

export const GUITAR_TUNINGS: Record<string, string[]> = {
  "Standard": ["E", "A", "D", "G", "B", "E"],
  "Drop D": ["D", "A", "D", "G", "B", "E"],
  "Eb Standard": ["D#", "G#", "C#", "F#", "A#", "D#"],
  "D Standard": ["D", "G", "C", "F", "A", "D"],
  "Drop C": ["C", "G", "C", "F", "A", "D"],
};

export type TuningName = keyof typeof GUITAR_TUNINGS;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export type FretPosition = {
  stringIndex: number; // 0 = high e (top row), 5 = low E (bottom row)
  fret: number;
  isRoot: boolean;
  note: string; // pitch class at this exact position, e.g. "F#"
};

/**
 * Given a set of scale/pentatonic notes and a root note, returns every
 * fret position (up to maxFret) on a guitar tuned to `tuning` where one
 * of those notes occurs. This is real fretboard math — not something an
 * AI should ever be asked to guess at.
 *
 * `tuning` is expected low-to-high (e.g. GUITAR_TUNINGS["Standard"] =
 * ["E","A","D","G","B","E"], matching how tunings are normally written
 * and how they're stored in GUITAR_TUNINGS). Fretboard rendering uses
 * the opposite order (stringIndex 0 = high e, 5 = low E), so the tuning
 * array is reversed once here rather than needing every caller to
 * remember to do it themselves.
 */
export function getFretPositions(
  notes: string[],
  rootNote: string,
  tuning: string[] = GUITAR_TUNINGS["Standard"],
  maxFret: number = 12
): FretPosition[] {
  const targetChromas = new Set(notes.map((n) => Note.chroma(n)));
  const rootChroma = Note.chroma(rootNote);
  const openStringChromas = [...tuning].reverse().map((n) => Note.chroma(n));

  const positions: FretPosition[] = [];

  openStringChromas.forEach((openChroma, stringIndex) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      const chroma = (openChroma + fret) % 12;
      if (targetChromas.has(chroma)) {
        positions.push({
          stringIndex,
          fret,
          isRoot: chroma === rootChroma,
          note: NOTE_NAMES[chroma],
        });
      }
    }
  });

  return positions;
}

/**
 * Which scale degree (0-6) is the diminished chord for a given mode.
 * This is NOT always the same index — it's degree 6 in Major, but
 * degree 1 in Minor, degree 5 in Dorian, degree 2 in Mixolydian. Any
 * code that wants to "add the diminished chord for tension" (see
 * refine.ts) needs to look it up per-mode rather than assuming index 6,
 * or it'll insert the wrong chord in every mode except Major.
 */
export function getDiminishedDegree(mode: ModeName): number {
  return MODE_QUALITIES[mode].indexOf("diminished");
}

function formatChordName(root: string, quality: ChordQuality): string {
  if (quality === "major") return root;
  if (quality === "minor") return `${root}m`;
  return `${root}dim`;
}

function formatDegree(numeral: string, quality: ChordQuality): string {
  if (quality === "major") return numeral;
  if (quality === "minor") return numeral.toLowerCase();
  return `${numeral.toLowerCase()}°`;
}

/**
 * Returns the 7 diatonic (in-key) chords for a given key + mode. Quality
 * (major/minor/diminished) comes from a fixed music-theory table, not from
 * guessing at intervals — so the output is always a clean, predictable
 * chord symbol like "C", "Dm", or "Bdim". This matters beyond display: the
 * chord-to-tab dictionary (Week 3) parses these names directly, so a
 * consistent format here is what keeps that lookup reliable.
 */
export function getDiatonicChords(
  key: string,
  mode: ModeName
): DiatonicChord[] {
  const scale = Scale.get(`${key} ${mode}`);
  const notes = scale.notes;

  if (!notes.length) {
    throw new Error(`Could not resolve scale for ${key} ${mode}`);
  }

  const qualities = MODE_QUALITIES[mode];

  return notes.map((note, i) => {
    const quality = qualities[i];
    return {
      name: formatChordName(note, quality),
      degree: formatDegree(ROMAN_NUMERALS[i], quality),
      quality,
    };
  });
}

/** Returns the plain 7-note scale for a key + mode. */
export function getScaleNotes(key: string, mode: ModeName): string[] {
  return Scale.get(`${key} ${mode}`).notes;
}

// Which pentatonic scale each mode "belongs to" for the purposes of the
// fretboard map. Dorian and Mixolydian don't have their own standard
// pentatonic in common usage, so we bucket them with their closest
// major/minor relative — this is a simplification, not strict theory.
const PENTATONIC_BY_MODE: Record<ModeName, "major pentatonic" | "minor pentatonic"> = {
  major: "major pentatonic",
  minor: "minor pentatonic",
  dorian: "minor pentatonic",
  mixolydian: "major pentatonic",
};

/** Returns the 5-note pentatonic scale associated with a key + mode. */
export function getPentatonicNotes(key: string, mode: ModeName): string[] {
  const pentatonicType = PENTATONIC_BY_MODE[mode];
  return Scale.get(`${key} ${pentatonicType}`).notes;
}

/** Returns the 3 chord-tone pitch classes (root, 3rd, 5th) for a given
 * scale degree, by stacking thirds within the 7-note scale. Shared by
 * anything that needs actual note names for a chord — melody
 * harmonization (Week 5) and audio playback (Week 7) both use this
 * instead of each re-deriving it independently. */
export function getChordToneNotes(
  key: string,
  mode: ModeName,
  degree: number
): string[] {
  const scaleNotes = getScaleNotes(key, mode);
  return [
    scaleNotes[degree % 7],
    scaleNotes[(degree + 2) % 7],
    scaleNotes[(degree + 4) % 7],
  ];
}