"use client";

import { useEffect, useMemo, useState } from "react";
import KeySelector, { type Mode, type SkillLevel } from "@/components/KeySelector";
import ChordCard from "@/components/ChordCard";
import ScaleMap from "@/components/ScaleMap";
import TabViewer from "@/components/TabViewer";
import AudioPlayer from "@/components/AudioPlayer";
import TheoryPanel from "@/components/TheoryPanel";
import PitchListener from "@/components/PitchListener";
import ChatRefine, { type ChatMessage } from "@/components/ChatRefine";
import AuthPanel from "@/components/AuthPanel";
import SavedSongs, { type SavedSong } from "@/components/SavedSongs";
import PricingPanel from "@/components/PricingPanel";
import { supabase } from "@/lib/supabaseClient";
import {
  getDiatonicChords,
  getPentatonicNotes,
  getFretPositions,
  type ModeName,
  type DiatonicChord,
} from "@/lib/musicTheory";
import { selectProgression, type VibeTags } from "@/lib/selectProgression";
import type { ModeName as ProgressionModeName } from "@/lib/progressions";
import { harmonizeMelody } from "@/lib/harmonize";
import { applyRefinement, type RefinementIntent } from "@/lib/refine";

const MODE_TO_ENGINE: Record<Mode, ModeName> = {
  Major: "major",
  Minor: "minor",
  Dorian: "dorian",
  Mixolydian: "mixolydian",
};

const ENGINE_TO_MODE: Record<ProgressionModeName, Mode> = {
  major: "Major",
  minor: "Minor",
  dorian: "Dorian",
  mixolydian: "Mixolydian",
};

const MODE_FROM_STRING: Record<string, Mode> = {
  Major: "Major",
  Minor: "Minor",
  Dorian: "Dorian",
  Mixolydian: "Mixolydian",
};

type ActiveProgression = {
  name: string;
  explanation: string;
  degrees: number[];
  source: "vibe" | "melody";
  detail: string | null;
};

type AuthUser = { id: string; email: string };

export default function Home() {
  const [vibe, setVibe] = useState("");
  const [musicKey, setMusicKey] = useState("E");
  const [mode, setMode] = useState<Mode>("Minor");
  const [skill, setSkill] = useState<SkillLevel>("Beginner");

  const [activeProgression, setActiveProgression] =
    useState<ActiveProgression | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [isRefining, setIsRefining] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // ---- Week 9: auth + credits ----
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setAuthUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setAuthUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) {
      setCredits(null);
      return;
    }
    supabase
      .from("profiles")
      .select("credits")
      .eq("id", authUser.id)
      .single()
      .then(({ data }) => {
        if (data) setCredits(data.credits as number);
      });
  }, [authUser]);

  /** Guests get unlimited local generation (no account, no tracking —
   * a deliberate "try before you sign up" choice). Logged-in users
   * spend a real, atomically-tracked credit per AI action; buying more
   * or subscribing is the entire point of Week 9's billing. */
  async function spendCredit(): Promise<{ ok: boolean; message?: string }> {
    if (!authUser) return { ok: true };
    const { data, error } = await supabase.rpc("spend_credit", {
      uid: authUser.id,
    });
    if (error) {
      return { ok: false, message: "Couldn't check credits — try again." };
    }
    if (data === null) {
      return {
        ok: false,
        message: "Out of credits — buy more below, or free up some time. 🙂",
      };
    }
    setCredits(data as number);
    return { ok: true };
  }

  const engineMode = MODE_TO_ENGINE[mode];

  const allChords = useMemo(
    () => getDiatonicChords(musicKey, engineMode),
    [musicKey, engineMode]
  );

  const pentatonicNotes = useMemo(
    () => getPentatonicNotes(musicKey, engineMode),
    [musicKey, engineMode]
  );

  const fretPositions = useMemo(
    () => getFretPositions(pentatonicNotes, musicKey),
    [pentatonicNotes, musicKey]
  );

  const pentatonicLabel =
    engineMode === "major" || engineMode === "mixolydian"
      ? `${musicKey} Major Pentatonic`
      : `${musicKey} Minor Pentatonic`;

  const activeDegrees = activeProgression?.degrees ?? allChords.map((_, i) => i);
  const displayedChords: DiatonicChord[] = activeProgression
    ? activeProgression.degrees.map((d) => allChords[d])
    : allChords;

  const currentSongForSaving = activeProgression
    ? {
        name: activeProgression.name,
        musicKey,
        mode,
        degrees: activeProgression.degrees,
      }
    : null;

  function handleKeyChange(k: string) {
    setMusicKey(k);
    setActiveProgression(null);
    setChatMessages([]);
  }
  function handleModeChange(m: Mode) {
    setMode(m);
    setActiveProgression(null);
    setChatMessages([]);
  }

  async function handleGenerate() {
    if (!vibe.trim()) return;

    const spend = await spendCredit();
    if (!spend.ok) {
      setGenerateError(spend.message ?? "Couldn't generate.");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setChatMessages([]);

    try {
      const res = await fetch("/api/tag-vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      const tags = data as VibeTags;
      const match = selectProgression(tags);

      setMode(ENGINE_TO_MODE[match.requiredMode]);
      setActiveProgression({
        name: match.name,
        explanation: match.explanation,
        degrees: match.degrees,
        source: "vibe",
        detail: vibe,
      });
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Couldn't generate — try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleMelodyDetected(notes: string[]) {
    // Not an AI action (see lib/harmonize.ts) — doesn't spend a credit.
    const result = harmonizeMelody(notes, musicKey, engineMode);
    setChatMessages([]);
    setActiveProgression({
      name: "Chords under your riff",
      explanation: result.explanation,
      degrees: result.degrees,
      source: "melody",
      detail: null,
    });
  }

  async function handleRefine(requestText: string) {
    if (!activeProgression) return;

    setChatMessages((prev) => [...prev, { role: "user", text: requestText }]);

    const spend = await spendCredit();
    if (!spend.ok) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: spend.message ?? "Out of credits." },
      ]);
      return;
    }

    setIsRefining(true);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: requestText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      const intent = data.intent as RefinementIntent;
      const result = applyRefinement(
        intent,
        activeProgression.degrees,
        engineMode,
        activeProgression.name
      );

      if (!result.applied) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", text: result.message },
        ]);
        return;
      }

      setMode(ENGINE_TO_MODE[result.mode]);
      setActiveProgression({
        ...activeProgression,
        name: result.name,
        explanation: result.explanation,
        degrees: result.degrees,
      });
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.explanation },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            err instanceof Error
              ? err.message
              : "Couldn't refine — try again.",
        },
      ]);
    } finally {
      setIsRefining(false);
    }
  }

  function handleLoadSavedSong(song: SavedSong) {
    setMusicKey(song.music_key);
    setMode(MODE_FROM_STRING[song.mode] ?? "Major");
    setActiveProgression({
      name: song.name,
      explanation: "Loaded from your saved songs.",
      degrees: song.degrees,
      source: "vibe",
      detail: null,
    });
    setChatMessages([]);
  }

  return (
    <main className="min-h-screen bg-rosewood">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-display text-lg italic text-parchment">
            Vibechord
          </span>
          <span className="font-mono text-xs text-ash">Beta build</span>
        </div>

        <div className="mb-6">
          <AuthPanel user={authUser} credits={credits} />
        </div>

        <section className="mb-10">
          <h1 className="font-display text-4xl leading-tight text-parchment sm:text-5xl">
            Turn a vibe into a song
            <br />
            <span className="italic text-brass">you can actually play.</span>
          </h1>
          <p className="mt-4 max-w-xl font-body text-ash">
            Describe a mood, or hum a riff. Get back a real chord
            progression, a scale map for the fretboard, and tabs sized to
            your skill level — never a hallucinated chord shape.
          </p>
        </section>

        <div className="space-y-4">
          <KeySelector
            vibe={vibe}
            onVibeChange={setVibe}
            musicKey={musicKey}
            onKeyChange={handleKeyChange}
            mode={mode}
            onModeChange={handleModeChange}
            skill={skill}
            onSkillChange={setSkill}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            generateError={generateError}
          />
          <PitchListener onMelodyDetected={handleMelodyDetected} />

          {activeProgression && (
            <ChatRefine
              messages={chatMessages}
              onSend={handleRefine}
              isRefining={isRefining}
            />
          )}

          <SavedSongs
            userId={authUser?.id ?? null}
            currentSong={currentSongForSaving}
            onLoad={handleLoadSavedSong}
          />

          {authUser && <PricingPanel userId={authUser.id} userEmail={authUser.email} />}
        </div>

        <div className="my-10 space-y-2">
          <div className="string string-6" />
          <div className="string string-5" />
          <div className="string string-4" />
          <div className="string string-3" />
          <div className="string string-2" />
          <div className="string string-1" />
        </div>

        <div className="space-y-10">
          <ChordCard
            chords={displayedChords}
            allChords={allChords}
            keyLabel={musicKey}
            modeLabel={mode}
            progressionName={activeProgression?.name ?? null}
            source={activeProgression?.source ?? null}
            onReset={() => {
              setActiveProgression(null);
              setChatMessages([]);
            }}
          />
          <ScaleMap
            positions={fretPositions}
            rootNote={musicKey}
            scaleLabel={pentatonicLabel}
          />
          <TabViewer chords={displayedChords} skill={skill} />

          <div className="grid gap-6 sm:grid-cols-2">
            <AudioPlayer
              chords={displayedChords}
              degrees={activeDegrees}
              musicKey={musicKey}
              mode={engineMode}
            />
            <TheoryPanel
              key={`${activeProgression?.name ?? "none"}-${displayedChords
                .map((c) => c.name)
                .join(",")}`}
              explanation={activeProgression?.explanation ?? null}
              progressionName={activeProgression?.name ?? null}
              source={activeProgression?.source ?? null}
              detail={activeProgression?.detail ?? null}
              chordNames={displayedChords.map((c) => c.name)}
              keyLabel={musicKey}
              modeLabel={mode}
              onBeforeQuiz={spendCredit}
            />
          </div>
        </div>

        <footer className="mt-16 border-t border-slate pt-6 text-center font-mono text-xs text-ash">
          Vibechord — built week by week, string by string.
        </footer>
      </div>
    </main>
  );
}
