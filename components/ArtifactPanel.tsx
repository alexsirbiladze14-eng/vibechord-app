"use client";

import { useState } from "react";
import type { Artifact } from "@/lib/artifacts";
import { artifactTitle } from "@/lib/artifacts";
import type { DiatonicChord, FretPosition, ModeName, TuningName } from "@/lib/musicTheory";
import type { SkillLevel } from "@/components/KeySelector";
import ChordCard from "./ChordCard";
import ScaleMap from "./ScaleMap";
import TabViewer from "./TabViewer";
import AudioPlayer from "./AudioPlayer";
import TheoryPanel from "./TheoryPanel";
import QuizWidget from "./QuizWidget";
import { useSynthVoice } from "@/lib/useSynthVoice";
import { Sparkles } from "lucide-react";
import type { QuizQuestion } from "@/lib/quiz";

type ProgressionView = {
  allChords: DiatonicChord[];
  displayedChords: DiatonicChord[];
  effectiveChords: DiatonicChord[];
  effectiveDegrees: number[];
  fretPositions: FretPosition[];
  pentatonicNotes: string[];
  pentatonicLabel: string;
  engineMode: ModeName;
  musicKey: string;
  showingAll: boolean;
  onResetToAll: () => void;
};

type Props = {
  artifacts: Artifact[];
  activeIndex: number | null;
  onSelectIndex: (i: number) => void;
  skill: SkillLevel;
  byokKey: string;
  progressionView: ProgressionView | null;
  tuning?: TuningName;
  setTuning?: (tuning: TuningName) => void;
  quizQuestions: QuizQuestion[] | null;
  onQuizRequest: () => void;
  onQuizFinish: () => void;
};

function TonePreview({ artifact }: { artifact: Extract<Artifact, { kind: "tone" }> }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { ensure } = useSynthVoice();

  async function play() {
    const { Tone, synth } = await ensure(artifact.preset, artifact.id);
    await Tone.start();
    setIsPlaying(true);
    const notes = ["E3", "G3", "B3"];
    synth.triggerAttackRelease(notes, 1.2);
    window.setTimeout(() => setIsPlaying(false), 1300);
  }

  return (
    <div className="rounded-lg border border-slate bg-rosewood/60 p-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-xl text-parchment">
          {artifact.query || "Tone match"}
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wide text-brass">
          {artifact.preset.label}
        </span>
      </div>
      <p className="font-body text-parchment/90 leading-relaxed">
        {artifact.description}
      </p>
      {artifact.followUpQuestion && (
        <p className="mt-3 rounded-md border border-slate bg-rosewood/60 p-3 text-sm text-brass">
          {artifact.followUpQuestion}
        </p>
      )}
      <button
        type="button"
        onClick={play}
        disabled={isPlaying}
        className="mt-4 flex items-center gap-2 rounded-md bg-brass px-4 py-2 text-sm font-medium text-rosewood transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPlaying ? "Playing…" : "▶ Preview this tone"}
      </button>
      <p className="mt-2 text-[11px] text-ash">
        Plays a neutral chord through the suggested effect chain — this is
        about the TONE, not a specific song's actual chords.
      </p>
    </div>
  );
}

export default function ArtifactPanel({
  artifacts,
  activeIndex,
  onSelectIndex,
  skill,
  byokKey,
  progressionView,
  tuning,
  setTuning,
  quizQuestions,
  onQuizRequest,
  onQuizFinish,
}: Props) {
  const activeArtifact = activeIndex !== null ? artifacts[activeIndex] : null;

  return (
    <div className="flex h-full flex-col bg-rosewood">
      {artifacts.length > 0 && (
        <div className="flex items-center justify-between border-b border-slate px-4 py-2.5 sm:px-6 bg-rosewood/80">
          <div className="flex gap-1.5 overflow-x-auto">
            {artifacts.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelectIndex(i)}
                className={`shrink-0 rounded-full px-3 py-1 font-mono text-[11px] transition-colors ${
                  i === activeIndex
                    ? "bg-brass text-rosewood"
                    : "bg-slate/40 text-ash hover:text-parchment"
                }`}
              >
                {artifactTitle(a)}
              </button>
            ))}
          </div>

          {activeArtifact?.kind === "progression" && !quizQuestions && (
            <button
              type="button"
              onClick={onQuizRequest}
              className="flex items-center gap-2 rounded-lg bg-brass px-3.5 py-1.5 font-mono text-xs font-bold text-rosewood shadow-sm transition-transform hover:scale-105 shrink-0"
            >
              <Sparkles size={14} /> Generate Quiz
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {!activeArtifact && (
          <div className="flex h-full items-center justify-center text-center text-sm text-ash">
            Nothing yet — ask Toney for a vibe, hum a riff, or ask about a
            tone, and it'll show up here.
          </div>
        )}

        {activeArtifact?.kind === "tone" && (
          <TonePreview artifact={activeArtifact} />
        )}

        {activeArtifact?.kind === "progression" && progressionView && (
          <div className="space-y-8">
            {quizQuestions && (
              <QuizWidget questions={quizQuestions} onFinish={onQuizFinish} />
            )}
            <ChordCard
              chords={progressionView.effectiveChords}
              allChords={progressionView.allChords}
              keyLabel={progressionView.musicKey}
              modeLabel={activeArtifact.mode}
              progressionName={
                progressionView.showingAll ? null : activeArtifact.name
              }
              source={progressionView.showingAll ? null : activeArtifact.source}
              onReset={progressionView.onResetToAll}
            />
            <ScaleMap
              positions={progressionView.fretPositions}
              rootNote={progressionView.musicKey}
              scaleLabel={progressionView.pentatonicLabel}
              pentatonicNotes={progressionView.pentatonicNotes}
            />
            <TabViewer chords={progressionView.effectiveChords} skill={skill} />
            <div className="grid gap-6 sm:grid-cols-2">
              <AudioPlayer
                chords={progressionView.effectiveChords}
                degrees={progressionView.effectiveDegrees}
                musicKey={progressionView.musicKey}
                mode={progressionView.engineMode}
                genre={activeArtifact.genre}
              />
              <TheoryPanel
                key={activeArtifact.id}
                explanation={activeArtifact.explanation}
                progressionName={activeArtifact.name}
                source={activeArtifact.source}
                detail={activeArtifact.detail}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}