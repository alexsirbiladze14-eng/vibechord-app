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
  type ModeName,
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

function bestOf(pool: Progression[], tags: VibeTags): { progression: Progression; score: number } {
  let best = pool[0];
  let bestScore = -1;
  for (const p of pool) {
    const s = score(p, tags);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return { progression: best, score: bestScore };
}

/** Modes a user only ever reaches by deliberately picking them from
 * the dropdown — nobody defaults into Dorian or Mixolydian by
 * accident the way they might sit on Major or Minor. Once picked,
 * generation should never silently override that choice. */
const STICKY_MODES: ModeName[] = ["dorian", "mixolydian"];

/** Returns the single best-matching progression for a set of vibe tags.
 * Ties keep the first entry encountered, so results are stable and
 * testable rather than randomized.
 *
 * `excludeNames` lets the refinement flow (Week 6) say "give me the best
 * match that ISN'T the one already showing" — without this, a small tag
 * change (e.g. energy medium -> high) could still land back on the exact
 * same progression, making a "refine" click look like it did nothing.
 *
 * `preferredMode` respects whatever mode the user already had selected.
 * Two different policies, deliberately:
 *  - Major/Minor: switch only if NOTHING in the current mode matches
 *    the vibe at all — this is the adaptive behavior the whole vibe
 *    feature is built around ("sad indie rock" should be free to land
 *    on Minor even from a Major default).
 *  - Dorian/Mixolydian: NEVER switch away, even if the match is
 *    imperfect. These are rare, deliberate choices — a user who picked
 *    Mixolydian on purpose wants that modal color, not to have it
 *    silently discarded because the curated database's one
 *    Mixolydian entry doesn't happen to match today's vibe tags. */
export function selectProgression(
  tags: VibeTags,
  excludeNames: string[] = [],
  preferredMode?: ModeName
): Progression {
  const candidates = PROGRESSIONS.filter((p) => !excludeNames.includes(p.name));
  const pool = candidates.length > 0 ? candidates : PROGRESSIONS;

  if (preferredMode) {
    const sameMode = pool.filter((p) => p.requiredMode === preferredMode);
    if (sameMode.length > 0) {
      const { progression, score: sameModeScore } = bestOf(sameMode, tags);
      const isSticky = STICKY_MODES.includes(preferredMode);
      if (isSticky || sameModeScore > 0) return progression;
    }
  }

  return bestOf(pool, tags).progression;
}
