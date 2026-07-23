/**
 * selectProgression.ts
 *
 * Pure, deterministic matching — no AI involved. Given the tags the AI
 * extracted from the user's vibe text (see app/api/tag-vibe/route.ts),
 * this scores every entry in the curated database and returns the best
 * fit. Given the same tags, it always returns the same progression.
 */

import {
  PROGRESSIONS,
  GENRES,
  MOODS,
  ENERGY_LEVELS,
  type Progression,
  type Genre,
  type Mood,
  type Energy,
} from "./progressions";

export type VibeTags = {
  genre: Genre;
  mood: Mood;
  energy: Energy;
};

/** Defends against the AI returning a value outside the fixed vocabulary
 * (e.g. a genre we didn't list) by falling back to a safe default rather
 * than letting an unrecognized tag silently fail matching downstream. */
export function sanitizeTags(raw: unknown): VibeTags {
  const r = (raw ?? {}) as Partial<VibeTags>;
  const genre = GENRES.includes(r.genre as Genre) ? (r.genre as Genre) : "indie";
  const mood = MOODS.includes(r.mood as Mood) ? (r.mood as Mood) : "melancholy";
  const energy = ENERGY_LEVELS.includes(r.energy as Energy)
    ? (r.energy as Energy)
    : "medium";
  return { genre, mood, energy };
}

function score(progression: Progression, tags: VibeTags): number {
  let s = 0;
  if (progression.genres.includes(tags.genre)) s += 3;
  if (progression.moods.includes(tags.mood)) s += 2;
  if (progression.energy === tags.energy) s += 1;
  return s;
}

/** Returns the single best-matching progression for a set of vibe tags.
 * Ties keep the first entry encountered, so results are stable and
 * testable rather than randomized.
 *
 * `excludeNames` lets the refinement flow (Week 6) say "give me the best
 * match that ISN'T the one already showing" — without this, a small tag
 * change (e.g. energy medium -> high) could still land back on the exact
 * same progression, making a "refine" click look like it did nothing. */
export function selectProgression(
  tags: VibeTags,
  excludeNames: string[] = []
): Progression {
  const candidates = PROGRESSIONS.filter((p) => !excludeNames.includes(p.name));
  const pool = candidates.length > 0 ? candidates : PROGRESSIONS;

  let best = pool[0];
  let bestScore = -1;
  for (const p of pool) {
    const s = score(p, tags);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}
