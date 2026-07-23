/**
 * harmonize.ts
 *
 * Turns a sequence of detected notes (from humming or playing into the
 * mic) into a chord progression — deterministically, by checking which
 * of the 7 diatonic chords in the current key actually contain each
 * note as a chord tone. No AI involved: this is the same kind of
 * rule-based matching a music theory student would do by hand.
 */

import { getChordToneNotes, type ModeName } from "./musicTheory";

/** Strips the octave off a note name our own pitch detector produced
 * (e.g. "E4" -> "E"), since chord membership only cares about pitch
 * class, not which octave the note was played in. */
function pitchClass(noteWithOctave: string): string {
  return noteWithOctave.replace(/\d+$/, "");
}

export type HarmonizeResult = {
  degrees: number[];
  explanation: string;
};

/**
 * Walks through the detected melody note-by-note, and for each one picks
 * the diatonic chord degree that contains it — preferring a chord where
 * the melody note IS the root (the strongest possible fit) over one
 * where it's just present as the 3rd or 5th. Consecutive repeats collapse
 * into a single held chord, and the whole thing is capped at 8 chords so
 * the tab/chord display stays readable.
 */
export function harmonizeMelody(
  detectedNotes: string[],
  key: string,
  mode: ModeName
): HarmonizeResult {
  const degreesPicked: number[] = [];

  for (const noteWithOctave of detectedNotes) {
    const pc = pitchClass(noteWithOctave);

    let bestDegree = 0; // safe fallback: the tonic, if nothing else fits
    let bestScore = -1;

    for (let degree = 0; degree < 7; degree++) {
      const tones = getChordToneNotes(key, mode, degree);
      if (!tones.includes(pc)) continue;

      // Root match (2) beats third/fifth match (1) beats "not in this
      // chord at all" (skipped above via continue).
      const score = tones[0] === pc ? 2 : 1;
      if (score > bestScore) {
        bestScore = score;
        bestDegree = degree;
      }
    }

    // Avoid holding the exact same chord twice in a row — a sustained
    // note under one chord should read as one chord, not a repeat.
    if (degreesPicked[degreesPicked.length - 1] !== bestDegree) {
      degreesPicked.push(bestDegree);
    }
  }

  const capped = degreesPicked.slice(0, 8);

  const explanation =
    capped.length > 0
      ? "Built from the melody you hummed — each chord was picked because it contains the note you were on at that moment, favoring chords where your note is the root."
      : "Couldn't confidently match your melody to a chord in this key — try humming a bit more clearly, or check that the key/mode above matches what you were going for.";

  return { degrees: capped, explanation };
}
