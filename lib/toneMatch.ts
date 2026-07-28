/**
 * toneMatch.ts
 *
 * Support for the Tone Matching Assistant: the AI's job is narrow —
 * describe a target tone (from an artist/song reference, or a
 * follow-up about substitute gear) using ONLY the vocabulary of
 * effects and oscillator types this app already implements
 * (lib/soundPresets.ts), never anything outside that fixed set.
 *
 * This file's whole job is validating that output before it's ever
 * used to build a real Tone.js audio chain — every field is checked
 * against a known type/range and clamped or rejected, the same
 * defensive-parsing discipline used everywhere else the AI produces
 * structured data in this app (sanitizeTags, sanitizeQuiz, etc.).
 */

import type { SoundPreset, EffectSpec } from "./soundPresets";
import { DEFAULT_PRESET } from "./soundPresets";

const OSCILLATOR_TYPES = ["sine", "triangle", "sawtooth", "square"] as const;
const EFFECT_TYPES = [
  "distortion",
  "chorus",
  "freeverb",
  "tremolo",
  "feedbackDelay",
  "filter",
] as const;

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const num = typeof n === "number" && !Number.isNaN(n) ? n : fallback;
  return Math.min(max, Math.max(min, num));
}

function sanitizeEffect(raw: unknown): EffectSpec | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!EFFECT_TYPES.includes(r.type as (typeof EFFECT_TYPES)[number])) return null;

  switch (r.type) {
    case "distortion":
      return { type: "distortion", amount: clamp(r.amount, 0, 1, 0.3) };
    case "chorus":
      return {
        type: "chorus",
        frequency: clamp(r.frequency, 0.1, 10, 4),
        delayTime: clamp(r.delayTime, 0.5, 10, 2.5),
        depth: clamp(r.depth, 0, 1, 0.5),
      };
    case "freeverb":
      return {
        type: "freeverb",
        roomSize: clamp(r.roomSize, 0, 1, 0.4),
        dampening: clamp(r.dampening, 500, 8000, 3000),
      };
    case "tremolo":
      return {
        type: "tremolo",
        frequency: clamp(r.frequency, 0.5, 20, 5),
        depth: clamp(r.depth, 0, 1, 0.4),
      };
    case "feedbackDelay":
      return {
        type: "feedbackDelay",
        delayTime: clamp(r.delayTime, 0.05, 1, 0.25),
        feedback: clamp(r.feedback, 0, 0.9, 0.2), // capped below 1 to avoid runaway feedback
      };
    case "filter":
      return {
        type: "filter",
        frequency: clamp(r.frequency, 200, 12000, 2000),
        filterType: r.filterType === "highpass" ? "highpass" : "lowpass",
      };
    default:
      return null;
  }
}

/** Validates an AI-suggested preset field-by-field. Falls back to the
 * app's own neutral default rather than ever passing an unvalidated
 * shape into the code that constructs real Tone.js audio nodes. */
export function sanitizePreset(raw: unknown): SoundPreset {
  if (typeof raw !== "object" || raw === null) return DEFAULT_PRESET;
  const r = raw as Record<string, unknown>;

  const oscillatorType = OSCILLATOR_TYPES.includes(
    r.oscillatorType as (typeof OSCILLATOR_TYPES)[number]
  )
    ? (r.oscillatorType as SoundPreset["oscillatorType"])
    : DEFAULT_PRESET.oscillatorType;

  const envRaw = (r.envelope ?? {}) as Record<string, unknown>;
  const envelope = {
    attack: clamp(envRaw.attack, 0.001, 2, DEFAULT_PRESET.envelope.attack),
    decay: clamp(envRaw.decay, 0.01, 2, DEFAULT_PRESET.envelope.decay),
    sustain: clamp(envRaw.sustain, 0, 1, DEFAULT_PRESET.envelope.sustain),
    release: clamp(envRaw.release, 0.01, 3, DEFAULT_PRESET.envelope.release),
  };

  const effectsRaw = Array.isArray(r.effects) ? r.effects : [];
  const effects = effectsRaw
    .map(sanitizeEffect)
    .filter((e): e is EffectSpec => e !== null)
    .slice(0, 4); // a real amp/pedal chain rarely stacks more than this

  const label =
    typeof r.label === "string" && r.label.trim()
      ? r.label.trim().slice(0, 40)
      : "Custom tone";

  return { label, oscillatorType, envelope, effects };
}

export type ToneMatchResult = {
  description: string;
  preset: SoundPreset;
  followUpQuestion: string | null;
};

export function sanitizeToneMatchResult(raw: unknown): ToneMatchResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const description =
    typeof r.description === "string" && r.description.trim()
      ? r.description.trim()
      : null;
  if (!description) return null;

  const followUpQuestion =
    typeof r.followUpQuestion === "string" && r.followUpQuestion.trim()
      ? r.followUpQuestion.trim()
      : null;

  return {
    description,
    preset: sanitizePreset(r.preset),
    followUpQuestion,
  };
}
