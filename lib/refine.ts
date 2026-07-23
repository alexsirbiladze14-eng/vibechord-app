/**
 * refine.ts
 *
 * Week 6: lets the user say "make this darker" about an existing
 * progression. As with Week 4, the AI's only job (see
 * app/api/refine/route.ts) is classifying the request into one of a
 * FIXED set of intents — it never touches chords directly. This file
 * applies the actual transformation, and every move here is a real,
 * named music-theory technique, not an invented one:
 *
 *  - darker / brighter: switching to the parallel minor/major (same
 *    root, different mode) is a standard technique — recognizable in a
 *    huge number of real songs, not a guess.
 *  - simpler: just fewer chords, deduplicated.
 *  - tenser: introduces the vii° (diminished) chord, which is the most
 *    standard source of harmonic tension in a key.
 *  - different: picks another real progression from the curated
 *    database (same mechanism as Week 4), rather than inventing one.
 */

import type { ModeName } from "./musicTheory";
import { getDiminishedDegree } from "./musicTheory";
import { PROGRESSIONS, type Progression } from "./progressions";

export type RefinementIntent =
  | "darker"
  | "brighter"
  | "simpler"
  | "tenser"
  | "different";

export const REFINEMENT_INTENTS: RefinementIntent[] = [
  "darker",
  "brighter",
  "simpler",
  "tenser",
  "different",
];

export type RefinementResult = {
  degrees: number[];
  mode: ModeName;
  name: string;
  explanation: string;
  applied: boolean; // false = safe no-op, "message" explains why
  message: string;
};

const PARALLEL_MINOR: Record<ModeName, ModeName | null> = {
  major: "minor",
  mixolydian: "minor",
  minor: null, // already dark
  dorian: null, // already dark-leaning
};

const PARALLEL_MAJOR: Record<ModeName, ModeName | null> = {
  minor: "major",
  dorian: "major",
  major: null, // already bright
  mixolydian: null, // already bright-leaning
};

function dedupeConsecutive(degrees: number[]): number[] {
  return degrees.filter((d, i) => d !== degrees[i - 1]);
}

export function applyRefinement(
  intent: RefinementIntent,
  currentDegrees: number[],
  currentMode: ModeName,
  currentName: string
): RefinementResult {
  if (intent === "darker") {
    const target = PARALLEL_MINOR[currentMode];
    if (!target) {
      return {
        degrees: currentDegrees,
        mode: currentMode,
        name: currentName,
        explanation: "",
        applied: false,
        message:
          "This is already in a minor-feeling mode — try 'simpler' or 'tenser' instead.",
      };
    }
    return {
      degrees: currentDegrees,
      mode: target,
      name: `${currentName} (darker)`,
      explanation:
        "Switched to the parallel minor — same root note, same chord shapes' scale degrees, but every chord quality shifts toward minor. This is a standard technique (not a guess) used across countless real songs to darken a progression without changing its key center.",
      applied: true,
      message: "",
    };
  }

  if (intent === "brighter") {
    const target = PARALLEL_MAJOR[currentMode];
    if (!target) {
      return {
        degrees: currentDegrees,
        mode: currentMode,
        name: currentName,
        explanation: "",
        applied: false,
        message:
          "This is already in a major-feeling mode — try 'simpler' or 'tenser' instead.",
      };
    }
    return {
      degrees: currentDegrees,
      mode: target,
      name: `${currentName} (brighter)`,
      explanation:
        "Switched to the parallel major — same root note, same scale-degree shape, but every chord quality shifts toward major, lifting the overall mood.",
      applied: true,
      message: "",
    };
  }

  if (intent === "simpler") {
    const deduped = dedupeConsecutive(currentDegrees);
    if (deduped.length <= 2) {
      return {
        degrees: currentDegrees,
        mode: currentMode,
        name: currentName,
        explanation: "",
        applied: false,
        message: "This is already about as simple as a progression gets.",
      };
    }
    const simplified = deduped.slice(0, Math.max(2, deduped.length - 1));
    return {
      degrees: simplified,
      mode: currentMode,
      name: `${currentName} (simplified)`,
      explanation: `Trimmed to ${simplified.length} chords — fewer changes to track while playing, keeping the strongest part of the original movement.`,
      applied: true,
      message: "",
    };
  }

  if (intent === "tenser") {
    const dimDegree = getDiminishedDegree(currentMode);
    const hasDiminished = currentDegrees.includes(dimDegree);
    if (hasDiminished || currentDegrees.length < 2) {
      return {
        degrees: currentDegrees,
        mode: currentMode,
        name: currentName,
        explanation: "",
        applied: false,
        message: "This already includes the diminished chord for tension.",
      };
    }
    const withTension = [...currentDegrees];
    withTension.splice(withTension.length - 1, 0, dimDegree);
    return {
      degrees: withTension.slice(0, 8),
      mode: currentMode,
      name: `${currentName} (with tension)`,
      explanation:
        "Inserted the diminished chord just before the end — the most standard source of harmonic tension in any key, used here to add a moment of unease before resolving.",
      applied: true,
      message: "",
    };
  }

  // "different" — pick another real progression from the curated
  // database, same mode, excluding whatever's currently showing.
  const candidates: Progression[] = PROGRESSIONS.filter(
    (p) => p.requiredMode === currentMode && p.name !== currentName
  );
  if (candidates.length === 0) {
    return {
      degrees: currentDegrees,
      mode: currentMode,
      name: currentName,
      explanation: "",
      applied: false,
      message: "No other curated progression fits this exact mode right now.",
    };
  }
  const pick = candidates[0];
  return {
    degrees: pick.degrees,
    mode: pick.requiredMode,
    name: pick.name,
    explanation: pick.explanation,
    applied: true,
    message: "",
  };
}
