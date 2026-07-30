"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import ToneyChat from "@/components/ToneyChat";
import ArtifactPanel from "@/components/ArtifactPanel";
import AccountPanel from "@/components/AccountPanel";
import Sidebar from "@/components/Sidebar";
import { useToneyConversation } from "@/hooks/useToneyConversation";
import { getDiatonicChords, getPentatonicNotes, getFretPositions, GUITAR_TUNINGS, type ModeName } from "@/lib/musicTheory";
import { harmonizeMelody } from "@/lib/harmonize";
import { makeArtifactId, type ProgressionArtifact } from "@/lib/artifacts";
import type { Mode } from "@/components/KeySelector";

const MODE_TO_ENGINE: Record<Mode, ModeName> = {
  Major: "major",
  Minor: "minor",
  Dorian: "dorian",
  Mixolydian: "mixolydian",
};

const MODE_FROM_STRING: Record<string, Mode> = {
  Major: "Major",
  Minor: "Minor",
  Dorian: "Dorian",
  Mixolydian: "Mixolydian",
};

export default function ChatApp() {
  const { state, setters, actions } = useToneyConversation();
  const [showAccount, setShowAccount] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [mobileView, setMobileView] = useState<"chat" | "artifact">("chat");

  const hasArtifacts = state.artifacts.length > 0;

  useEffect(() => {
    if (state.activeIndex !== null) {
      setMobileView("artifact");
    }
  }, [state.activeIndex]);

  useEffect(() => {
    if (!hasArtifacts) {
      setMobileView("chat");
    }
  }, [hasArtifacts]);

  const progressionView = useMemo(() => {
    if (!state.activeArtifact || state.activeArtifact.kind !== "progression") return null;
    const a = state.activeArtifact as ProgressionArtifact;
    const engineMode = MODE_TO_ENGINE[a.mode];

    const allChords = getDiatonicChords(a.musicKey, engineMode);
    const displayedChords = a.degrees.map((d) => allChords[d]);
    const pentatonicNotes = getPentatonicNotes(a.musicKey, engineMode);

    const fretPositions = getFretPositions(pentatonicNotes, a.musicKey, GUITAR_TUNINGS[state.tuning]);

    const pentatonicLabel =
      engineMode === "major" || engineMode === "mixolydian"
        ? `${a.musicKey} Major Pentatonic`
        : `${a.musicKey} Minor Pentatonic`;

    const effectiveChords = state.showingAll ? allChords : displayedChords;
    const effectiveDegrees = state.showingAll ? allChords.map((_, i) => i) : a.degrees;

    return {
      allChords, displayedChords, effectiveChords, effectiveDegrees,
      fretPositions, pentatonicNotes, pentatonicLabel, engineMode,
      musicKey: a.musicKey, showingAll: state.showingAll,
      onResetToAll: () => setters.setShowingAll(true),
    };
  }, [state.activeArtifact, state.showingAll, state.tuning, setters]);

  const currentSongForSaving = state.activeArtifact?.kind === "progression"
    ? {
        name: state.activeArtifact.name,
        musicKey: state.activeArtifact.musicKey,
        mode: state.activeArtifact.mode,
        degrees: state.activeArtifact.degrees,
      }
    : null;

  function handleMelodyDetected(notes: string[]) {
    const engineMode = MODE_TO_ENGINE[state.defaultMode];
    const result = harmonizeMelody(notes, state.musicKey, engineMode);
    actions.pushArtifact({
      kind: "progression",
      id: makeArtifactId(),
      createdAt: Date.now(),
      name: "Chords under your riff",
      explanation: result.explanation,
      degrees: result.degrees,
      source: "melody",
      detail: null,
      genre: null,
      musicKey: state.musicKey,
      mode: state.defaultMode,
    });
    actions.pushMessage({ role: "user", text: "🎤 Hummed a melody" });
    actions.pushMessage({ role: "assistant", text: result.explanation, animate: true });
  }

  if (showAccount) {
    return (
      <main className="h-[100dvh] overflow-y-auto bg-rosewood">
        <AccountPanel
          user={state.authUser}
          credits={state.credits}
          isSubscriber={state.isSubscriber}
          onByokKeyChange={setters.setByokKey}
          currentSong={currentSongForSaving}
          onLoadSavedSong={(song) => {
            actions.pushArtifact({
              kind: "progression",
              id: makeArtifactId(),
              createdAt: Date.now(),
              name: song.name,
              explanation: "Loaded from your saved songs.",
              degrees: song.degrees,
              source: "saved",
              detail: null,
              genre: null,
              musicKey: song.music_key,
              mode: MODE_FROM_STRING[song.mode] ?? "Major",
            });
            setShowAccount(false);
          }}
          onClose={() => setShowAccount(false)}
        />
      </main>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-rosewood selection:bg-brass selection:text-rosewood">

      <Sidebar
        authUser={state.authUser}
        onOpenAccount={() => setShowAccount(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversationList={state.conversationList}
        currentConversationId={state.currentConversationId}
        onNewSession={actions.handleNewSession}
        onOpenConversation={actions.handleOpenConversation}
      />

      <div className="flex flex-1 flex-col overflow-hidden relative">

        {/*
          FIX: `justify-between` only guarantees equal GAPS around the
          middle item — it doesn't put the middle item at the
          container's true center unless the two outer items are the
          same width. Logo (w-28) and the hamburger icon aren't, so the
          toggle was drifting toward the hamburger side. Now the toggle
          is absolutely positioned at left-1/2 with a -50% transform,
          which centers it on the header itself regardless of what the
          logo or hamburger measure.
        */}
        <header className="md:hidden relative flex items-center justify-between px-4 py-3 border-b border-slate bg-rosewood/90 backdrop-blur-sm z-20 shrink-0">
           <Link
             href="/chat"
             onClick={() => actions.handleNewSession()}
             className="relative h-10 w-28 shrink-0 transition-opacity active:opacity-60"
             aria-label="Back to start"
           >
             <Image src="/logo.png" alt="Vibechord" fill sizes="112px" className="object-contain object-left" priority />
           </Link>

           {hasArtifacts && (
             <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex bg-rosewood rounded-lg border border-slate p-1">
               <button
                 type="button"
                 onClick={() => setMobileView("chat")}
                 className={`px-3.5 py-1.5 rounded-md text-xs font-bold tracking-wide uppercase transition-all duration-200 ${
                   mobileView === "chat" ? "bg-brass text-rosewood shadow-md" : "text-ash hover:text-parchment"
                 }`}
               >
                 Chat
               </button>
               <button
                 type="button"
                 onClick={() => setMobileView("artifact")}
                 className={`px-3.5 py-1.5 rounded-md text-xs font-bold tracking-wide uppercase transition-all duration-200 ${
                   mobileView === "artifact" ? "bg-brass text-rosewood shadow-md" : "text-ash hover:text-parchment"
                 }`}
               >
                 Theory
               </button>
             </div>
           )}

           <button
             onClick={() => setIsSidebarOpen(true)}
             className="text-ash hover:text-brass transition-colors active:scale-90 shrink-0"
             aria-label="Open menu"
           >
             <Menu size={24} />
           </button>
        </header>

        <div className="flex flex-1 flex-col sm:flex-row overflow-hidden relative">

          <div
            className={`${mobileView === "chat" ? "flex" : "hidden"} sm:flex flex-col transition-all duration-500 ease-out shrink-0 h-full ${
              hasArtifacts ? "w-full sm:w-[45%] md:w-[40%] sm:border-r sm:border-slate" : "w-full"
            }`}
          >
            <ToneyChat
              messages={state.chatMessages}
              onSend={actions.handleToneySend}
              isSending={state.isSending}
              onMelodyDetected={handleMelodyDetected}
              headerRight={
                <div className="hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setShowAccount(true)}
                    className="rounded-md border border-slate px-3 py-1.5 font-mono text-xs text-ash hover:border-brass hover:text-brass transition-colors"
                  >
                    {state.authUser ? `${state.credits ?? "—"} credits` : "Account"}
                  </button>
                </div>
              }
            />
          </div>

          {hasArtifacts && (
            <div
              className={`${mobileView === "artifact" ? "flex" : "hidden"} sm:flex flex-col bg-rosewood transition-all duration-500 ease-out shrink-0 h-full w-full sm:w-[55%] md:w-[60%]`}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ArtifactPanel
                  artifacts={state.artifacts}
                  activeIndex={state.activeIndex}
                  onSelectIndex={setters.setActiveIndex}
                  skill={state.skill}
                  byokKey={state.byokKey}
                  progressionView={progressionView}
                  tuning={state.tuning}
                  setTuning={setters.setTuning}
                  quizQuestions={state.quizQuestions}
                  onQuizRequest={actions.onQuizRequest}
                  onQuizFinish={actions.onQuizFinish}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}