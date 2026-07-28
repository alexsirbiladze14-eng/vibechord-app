/**
 * soundPresets.ts
 *
 * Maps a genre (already classified by /api/tag-vibe in Week 4 — this
 * file adds no new AI call) to a synth voice + effects chain.
 *
 * NOTE: an earlier version of this used Tone.PluckSynth (a physically-
 * modeled plucked string) to sound more like a real guitar. It didn't
 * land well in practice (too short/decayed too fast, didn't read as
 * "guitar") and PluckSynth has a real technical limitation besides —
 * it's monophonic and can't be wrapped in PolySynth. Reverted back to
 * a stable oscillator + envelope voice, which is what's here now.
 *
 * Every choice below is still a real, named audio technique tied to
 * how that genre actually tends to sound on a real instrument:
 *
 *  - metal/punk: heavy Distortion, short punchy envelope (palm-muted feel)
 *  - blues: light Distortion + Tremolo (classic amp tremolo)
 *  - indie: Chorus (the "jangly" indie-guitar chorus sound) + light room
 *  - lo-fi: Chorus + a low-pass Filter (muffled, warped-tape feel)
 *  - jazz-influenced: subtle Chorus + a soft FeedbackDelay (echo)
 *  - pop/ballad/folk: clean tone, Freeverb only, varying by sustain length
 */

import type { Genre } from "./progressions";

export type EffectSpec =
  | { type: "distortion"; amount: number }
  | { type: "chorus"; frequency: number; delayTime: number; depth: number }
  | { type: "freeverb"; roomSize: number; dampening: number }
  | { type: "tremolo"; frequency: number; depth: number }
  | { type: "feedbackDelay"; delayTime: number; feedback: number }
  | { type: "filter"; frequency: number; filterType: "lowpass" | "highpass" };

export type SoundPreset = {
  label: string; // shown in the UI so the sound choice is transparent, not hidden
  oscillatorType: "sine" | "triangle" | "sawtooth" | "square";
  envelope: { attack: number; decay: number; sustain: number; release: number };
  effects: EffectSpec[];
};

export const DEFAULT_PRESET: SoundPreset = {
  label: "Clean",
  oscillatorType: "sine",
  envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8 },
  effects: [],
};

const GENRE_PRESETS: Record<Genre, SoundPreset> = {
  metal: {
    label: "Distorted, palm-muted",
    oscillatorType: "sawtooth",
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.3 },
    effects: [
      { type: "distortion", amount: 0.65 },
      { type: "filter", frequency: 2000, filterType: "lowpass" },
    ],
  },
  punk: {
    label: "Raw, driven",
    oscillatorType: "sawtooth",
    envelope: { attack: 0.005, decay: 0.08, sustain: 0.15, release: 0.2 },
    effects: [{ type: "distortion", amount: 0.5 }],
  },
  rock: {
    label: "Overdriven",
    oscillatorType: "sawtooth",
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 },
    effects: [{ type: "distortion", amount: 0.3 }],
  },
  blues: {
    label: "Warm amp tremolo",
    oscillatorType: "triangle",
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.6 },
    effects: [
      { type: "distortion", amount: 0.15 },
      { type: "tremolo", frequency: 5, depth: 0.4 },
    ],
  },
  indie: {
    label: "Jangly chorus",
    oscillatorType: "triangle",
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.8 },
    effects: [
      { type: "chorus", frequency: 4, delayTime: 2.5, depth: 0.6 },
      { type: "freeverb", roomSize: 0.4, dampening: 2000 },
    ],
  },
  "lo-fi": {
    label: "Muffled, warped",
    oscillatorType: "sine",
    envelope: { attack: 0.05, decay: 0.4, sustain: 0.4, release: 1.0 },
    effects: [
      { type: "chorus", frequency: 2, delayTime: 3.5, depth: 0.4 },
      { type: "filter", frequency: 1800, filterType: "lowpass" },
    ],
  },
  "jazz-influenced": {
    label: "Smooth, soft echo",
    oscillatorType: "sine",
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 1.0 },
    effects: [
      { type: "chorus", frequency: 3, delayTime: 2, depth: 0.3 },
      { type: "feedbackDelay", delayTime: 0.25, feedback: 0.2 },
    ],
  },
  pop: {
    label: "Bright and clean",
    oscillatorType: "triangle",
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.5 },
    effects: [{ type: "freeverb", roomSize: 0.3, dampening: 3000 }],
  },
  ballad: {
    label: "Lush and sustained",
    oscillatorType: "sine",
    envelope: { attack: 0.05, decay: 0.5, sustain: 0.7, release: 1.5 },
    effects: [{ type: "freeverb", roomSize: 0.6, dampening: 2500 }],
  },
  folk: {
    label: "Light and acoustic-ish",
    oscillatorType: "triangle",
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.6 },
    effects: [{ type: "freeverb", roomSize: 0.2, dampening: 3500 }],
  },
};

export function getSoundPreset(genre: Genre | null): SoundPreset {
  return genre ? GENRE_PRESETS[genre] : DEFAULT_PRESET;
}
