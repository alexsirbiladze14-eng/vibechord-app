/**
 * artifacts.ts
 *
 * With Toney as a single unified chat, a conversation can produce two
 * different kinds of result: a chord progression (from generate/refine/
 * hum/load) or a tone-match result (gear/effects for a requested tone).
 * Both get pushed into one history list in the side panel, so this
 * file defines the shared shape and a small id helper.
 *
 * A progression artifact carries its OWN key/mode/degrees snapshot
 * (rather than relying on whatever the global "current" selector says)
 * so that paging back to an older result in history shows exactly what
 * it showed when it was created, even if the user has since changed
 * the key/mode for new generations.
 */

import type { Mode } from "@/components/KeySelector";
import type { Genre } from "./progressions";
import type { SoundPreset } from "./soundPresets";

export type ProgressionSource = "vibe" | "melody" | "refine" | "saved";

export type ProgressionArtifact = {
  kind: "progression";
  id: string;
  createdAt: number;
  name: string;
  explanation: string;
  degrees: number[];
  source: ProgressionSource;
  detail: string | null; // the typed vibe text, only meaningful for source "vibe"
  genre: Genre | null;
  musicKey: string;
  mode: Mode;
};

export type ToneMatchArtifact = {
  kind: "tone";
  id: string;
  createdAt: number;
  query: string;
  description: string;
  preset: SoundPreset;
  followUpQuestion: string | null;
};

export type Artifact = ProgressionArtifact | ToneMatchArtifact;

export function makeArtifactId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Short label shown in the history strip — kept to a few words so a
 * row of these stays scannable regardless of how many artifacts pile up. */
export function artifactTitle(a: Artifact): string {
  if (a.kind === "tone") return a.query.slice(0, 24) || "Tone match";
  return a.name;
}
