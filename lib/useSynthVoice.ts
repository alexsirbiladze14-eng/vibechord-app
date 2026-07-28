"use client";

/**
 * useSynthVoice.ts
 *
 * Shared Tone.js synth-building logic, used by both AudioPlayer (chord
 * playback) and the new pentatonic scale player in ScaleMap. Extracted
 * here so the "build a genre-matched voice" logic — including the
 * Tone.js version-pinning note below — exists in exactly one place
 * instead of being copy-pasted between two components.
 */

import { useEffect, useRef } from "react";
import type { EffectSpec, SoundPreset } from "./soundPresets";

type AudioNodeLike = {
  connect: (dest: unknown) => unknown;
  toDestination: () => unknown;
  dispose: () => void;
};

function createEffectNode(
  Tone: typeof import("tone"),
  spec: EffectSpec
): AudioNodeLike {
  switch (spec.type) {
    case "distortion":
      return new Tone.Distortion(spec.amount) as unknown as AudioNodeLike;
    case "chorus":
      return new Tone.Chorus(
        spec.frequency,
        spec.delayTime,
        spec.depth
      ).start() as unknown as AudioNodeLike;
    case "freeverb":
      return new Tone.Freeverb(
        spec.roomSize,
        spec.dampening
      ) as unknown as AudioNodeLike;
    case "tremolo":
      return new Tone.Tremolo(
        spec.frequency,
        spec.depth
      ).start() as unknown as AudioNodeLike;
    case "feedbackDelay":
      return new Tone.FeedbackDelay(
        spec.delayTime,
        spec.feedback
      ) as unknown as AudioNodeLike;
    case "filter":
      return new Tone.Filter(
        spec.frequency,
        spec.filterType
      ) as unknown as AudioNodeLike;
  }
}

/** Builds a Tone.js voice from any SoundPreset — whether it came from
 * the fixed genre lookup table (AudioPlayer) or an AI-suggested preset
 * (the Tone Matching Assistant). The caller supplies both the preset
 * and a stable key describing it, so this hook doesn't need to know
 * or care where the preset came from. */
export function useSynthVoice() {
  // IMPORTANT: package.json pins tone to EXACTLY 14.7.77 (no ^ range).
  // Tone.js 14.8+ switched to a pure-ESM package, which breaks under
  // Next.js's module handling (Tone.js's own GitHub issue #1077) —
  // 14.7.77 is the last plain-CommonJS release and imports cleanly.
  const toneRef = useRef<typeof import("tone") | null>(null);
  const synthRef = useRef<import("tone").PolySynth | null>(null);
  const effectsRef = useRef<AudioNodeLike[]>([]);
  const builtForRef = useRef<string>("__unbuilt__");

  function dispose() {
    synthRef.current?.dispose();
    effectsRef.current.forEach((e) => e.dispose());
    synthRef.current = null;
    effectsRef.current = [];
    builtForRef.current = "__unbuilt__";
  }

  async function ensure(preset: SoundPreset, presetKey: string) {
    if (!toneRef.current) {
      toneRef.current = await import("tone");
    }
    const Tone = toneRef.current;

    if (builtForRef.current !== presetKey) {
      dispose();

      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: preset.oscillatorType },
        envelope: preset.envelope,
      });

      const effectNodes = preset.effects.map((spec) =>
        createEffectNode(Tone, spec)
      );
      effectsRef.current = effectNodes;

      if (effectNodes.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (synth as any).chain(...effectNodes, Tone.Destination);
      } else {
        synth.toDestination();
      }

      synthRef.current = synth;
      builtForRef.current = presetKey;
    }

    return { Tone, synth: synthRef.current as import("tone").PolySynth };
  }

  useEffect(() => {
    return () => dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ensure, dispose };
}
