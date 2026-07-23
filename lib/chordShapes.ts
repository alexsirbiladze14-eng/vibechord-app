/**
 * chordShapes.ts
 *
 * The second half of the deterministic layer: given a chord NAME (already
 * calculated by musicTheory.ts — never invented here), return every real,
 * playable way to fret it, then pick the one that suits the player's skill.
 *
 * Nothing here is guessed or AI-generated. Shapes are either hand-verified
 * open voicings, or movable shapes built from standard CAGED-system math
 * and checked interval-by-interval against the chord's actual notes.
 */

import { Note } from "tonal";
import type { ChordQuality } from "./musicTheory";

export type Difficulty = "open" | "barre" | "extended";
export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

export type ChordVoicing = {
  // 6 entries, low E to high e. null = muted string, 0 = open string.
  frets: (number | null)[];
  difficulty: Difficulty; // drives the colour coding
  badge: string; // short tag shown on the card: "open", "easy", "barre", "dim"
  label: string; // longer name used on the voicing-switcher buttons
  baseFret: number; // lowest fretted note (used for the "5fr" label)
  mutedStrings: number[]; // indices into frets[] that must not ring
};

// Index 0 = 6th string (thickest, low E) ... index 5 = 1st string (high e).
const STRING_ORDINALS = ["6th", "5th", "4th", "3rd", "2nd", "1st"];
const STRING_NOTES = ["low E", "A", "D", "G", "B", "high e"];

/**
 * Hand-verified open-position shapes. Note the muted strings: an open A or
 * C is rooted on the 5th string, so the 6th must stay silent — letting it
 * ring puts a non-chord tone in the bass. Open D mutes both 6th and 5th.
 */
const OPEN_CHORDS: Record<string, (number | null)[]> = {
  E: [0, 2, 2, 1, 0, 0],
  Em: [0, 2, 2, 0, 0, 0],
  A: [null, 0, 2, 2, 2, 0],
  Am: [null, 0, 2, 2, 1, 0],
  D: [null, null, 0, 2, 3, 2],
  Dm: [null, null, 0, 2, 3, 1],
  C: [null, 3, 2, 0, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
};

/** Semitones from a reference open string up to the root — i.e. the fret
 * where a movable shape rooted on that string sits. */
function fretAbove(root: string, referenceString: string): number {
  const distance = Note.chroma(root)! - Note.chroma(referenceString)!;
  return ((distance % 12) + 12) % 12;
}

function mutedIn(frets: (number | null)[]): number[] {
  return frets.reduce<number[]>(
    (acc, f, i) => (f === null ? [...acc, i] : acc),
    []
  );
}

function lowestFret(frets: (number | null)[]): number {
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  return fretted.length ? Math.min(...fretted) : 1;
}

function makeVoicing(
  frets: (number | null)[],
  difficulty: Difficulty,
  badge: string,
  label: string
): ChordVoicing {
  return {
    frets,
    difficulty,
    badge,
    label,
    baseFret: lowestFret(frets),
    mutedStrings: mutedIn(frets),
  };
}

function parseChordName(name: string): { root: string; quality: ChordQuality } {
  if (name.endsWith("dim")) {
    return { root: name.slice(0, -3), quality: "diminished" };
  }
  if (name.endsWith("m")) {
    return { root: name.slice(0, -1), quality: "minor" };
  }
  return { root: name, quality: "major" };
}

/**
 * Builds every genuine voicing for a chord. Four movable templates, each
 * verified against real interval math rather than assumed:
 *
 *  - E-shape barre: root on the 6th string, all six strings ring.
 *  - A-shape barre: root on the 5th string, 6th string MUTED.
 *  - Easy 4-string: root on the 4th string, 6th and 5th MUTED. No barre
 *    required — this is the shape most teachers give beginners for chords
 *    like F, long before their barre is reliable.
 *  - Diminished triad: compact 4-string shape, both outer strings muted.
 *    (This replaces an earlier minor-shape stand-in — it's a genuine
 *    root / flat-3rd / flat-5th voicing that transposes correctly.)
 */
export function getVoicings(chordName: string): ChordVoicing[] {
  const { root, quality } = parseChordName(chordName);
  const voicings: ChordVoicing[] = [];

  // 1. True open shape, if this chord genuinely has a comfortable one.
  const open = OPEN_CHORDS[chordName];
  if (open) {
    voicings.push(makeVoicing(open, "open", "open", "Open"));
  }

  if (quality === "diminished") {
    // Movable diminished triad, root on the 5th string.
    // From the root: root / flat5 / root / flat3.
    const f = fretAbove(root, "A");
    voicings.push(
      makeVoicing(
        [null, f, f + 1, f + 2, f + 1, null],
        "extended",
        "dim",
        "Dim triad"
      )
    );
    return voicings;
  }

  // 2. Easy 4-string shape, root on the 4th string, no barre needed.
  const dFret = fretAbove(root, "D");
  if (quality === "major" && dFret >= 2) {
    voicings.push(
      makeVoicing(
        [null, null, dFret, dFret - 1, dFret - 2, dFret - 2],
        "open",
        "easy",
        "Easy 4-string"
      )
    );
  }
  if (quality === "minor" && dFret >= 1) {
    voicings.push(
      makeVoicing(
        [null, null, dFret, dFret + 2, dFret + 3, dFret + 1],
        "open",
        "easy",
        "Easy 4-string"
      )
    );
  }

  // 3. E-shape barre (root on 6th string). Skipped at fret 0, since that
  //    IS the open chord already listed above.
  const eFret = fretAbove(root, "E");
  if (eFret > 0) {
    const shape =
      quality === "major"
        ? [eFret, eFret + 2, eFret + 2, eFret + 1, eFret, eFret]
        : [eFret, eFret + 2, eFret + 2, eFret, eFret, eFret];
    voicings.push(makeVoicing(shape, "barre", "barre", "E-shape barre"));
  }

  // 4. A-shape barre (root on 5th string, 6th string muted).
  const aFret = fretAbove(root, "A");
  if (aFret > 0) {
    const shape =
      quality === "major"
        ? [null, aFret, aFret + 2, aFret + 2, aFret + 2, aFret]
        : [null, aFret, aFret + 2, aFret + 2, aFret + 1, aFret];
    voicings.push(makeVoicing(shape, "barre", "barre", "A-shape barre"));
  }

  return voicings;
}

/**
 * How strongly a voicing suits a given player. Lower score wins.
 *
 * Beginner avoids barres entirely where a real alternative exists — so a
 * chord like F comes back as the easy 4-string shape, not a barre.
 * Intermediate treats the barre as the proper way to play those chords and
 * prefers it over the partial shape, while still using true open chords
 * where they exist. Advanced leans into movable barre shapes, since those
 * let you stay in one position and transpose freely.
 */
function score(voicing: ChordVoicing, skill: SkillLevel): number {
  const kind = voicing.badge; // "open" | "easy" | "barre" | "dim"
  const position = voicing.baseFret;

  if (skill === "Beginner") {
    const base = kind === "open" ? 0 : kind === "easy" ? 10 : 100;
    return base + position;
  }
  if (skill === "Intermediate") {
    const base = kind === "open" ? 0 : kind === "easy" ? 60 : 25;
    return base + position;
  }
  // Advanced
  const base = kind === "open" ? 45 : kind === "easy" ? 80 : 0;
  return base + position;
}

/** Returns the best-fitting voicing for the player, plus the other real
 * options — so a chord like C offers open, A-shape barre at 3, E-shape
 * barre at 8, and an easy 4-string shape, all correct, player's choice. */
export function pickVoicings(
  chordName: string,
  skill: SkillLevel
): { primary: ChordVoicing; alternates: ChordVoicing[] } {
  const all = getVoicings(chordName);
  const sorted = [...all].sort((a, b) => score(a, skill) - score(b, skill));
  return { primary: sorted[0], alternates: sorted.slice(1) };
}

/** Plain-English instruction for which strings to leave silent. */
export function mutingNote(mutedStrings: number[]): string | null {
  if (mutedStrings.length === 0) return null;
  const parts = mutedStrings.map(
    (i) => `${STRING_ORDINALS[i]} (${STRING_NOTES[i]})`
  );
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `Don't play the ${list} string${parts.length > 1 ? "s" : ""}.`;
}
