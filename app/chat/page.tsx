"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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

  const hasArtifacts = state.artifacts.length > 0;

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
      <main className="h-screen overflow-y-auto bg-rosewood">
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
    <div className="flex h-screen w-full overflow-hidden bg-rosewood selection:bg-brass selection:text-rosewood">
      
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
        
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate bg-rosewood z-20">
           <div className="relative h-8 w-24">
             <Image src="/logo.png" alt="Vibechord" fill sizes="96px" className="object-contain object-left" priority />
           </div>
           <button
             onClick={() => setIsSidebarOpen(true)}
             className="text-ash hover:text-parchment transition-colors"
           >
             <Menu size={24} />
           </button>
        </header>

        <div className="flex flex-1 flex-col sm:flex-row overflow-hidden relative">
          
          <div className={`flex flex-col transition-all duration-700 ease-in-out shrink-0 h-full ${hasArtifacts ? "w-full sm:w-[45%] md:w-[40%] border-r border-slate" : "w-full"}`}>
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

          <div className={`flex flex-col bg-rosewood transition-all duration-700 ease-in-out shrink-0 h-full ${hasArtifacts ? "w-full sm:w-[55%] md:w-[60%] opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-full overflow-hidden border-none absolute right-0"}`}>
            
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
        </div>
      </div>
    </div>
  );
}