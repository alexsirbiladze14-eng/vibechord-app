"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Plus, Trash2, ChevronDown, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import AccountPanel from "@/components/AccountPanel";
import TunerStringBadge from "@/components/TunerStringBadge";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";
import { supabase } from "@/lib/supabaseClient";
import type { AuthUser } from "@/hooks/useToneyConversation";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4 = 440;

const DEFAULT_PRESETS: Record<string, string[]> = {
  "Standard": ["E", "A", "D", "G", "B", "E"],
  "Drop D": ["D", "A", "D", "G", "B", "E"],
  "Half Step Down": ["D#", "G#", "C#", "F#", "A#", "D#"],
};

function getNoteData(freq: number) {
  const halfSteps = Math.round(12 * Math.log2(freq / A4));
  const exactFreq = A4 * Math.pow(2, halfSteps / 12);
  const cents = Math.floor(1200 * Math.log2(freq / exactFreq));
  const noteIndex = (halfSteps + 69) % 12;
  return {
    note: NOTES[noteIndex >= 0 ? noteIndex : noteIndex + 12],
    cents,
    freq
  };
}

export default function TunerPage() {
  const router = useRouter();
  const { pitch, isListening, startListening, stopListening } = useAudioAnalyzer();
  const [showAccount, setShowAccount] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [byokKey, setByokKey] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setAuthUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setAuthUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) {
      setCredits(null);
      setIsSubscriber(false);
      return;
    }
    supabase
      .from("profiles")
      .select("credits, subscription_status")
      .eq("id", authUser.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setCredits(data.credits as number);
        setIsSubscriber(data.subscription_status === "active");
      });
  }, [authUser]);

  const [mode, setMode] = useState<"Free" | "Guided">("Guided");
  const [customTunings, setCustomTunings] = useState<Record<string, string[]>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>("Standard");

  const [isBuilding, setIsBuilding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStrings, setNewStrings] = useState<string[]>(["E", "A", "D", "G", "B", "E"]);

  useEffect(() => {
    const saved = localStorage.getItem("vibechord_custom_tunings");
    if (saved) setCustomTunings(JSON.parse(saved));
  }, []);

  const allPresets = { ...DEFAULT_PRESETS, ...customTunings };

  const saveCustomTuning = () => {
    if (!newName.trim()) return;
    const updated = { ...customTunings, [newName]: newStrings };
    setCustomTunings(updated);
    localStorage.setItem("vibechord_custom_tunings", JSON.stringify(updated));
    setSelectedPreset(newName);
    setIsBuilding(false);
    setNewName("");
  };

  const deleteCustomTuning = (name: string) => {
    const updated = { ...customTunings };
    delete updated[name];
    setCustomTunings(updated);
    localStorage.setItem("vibechord_custom_tunings", JSON.stringify(updated));
    setSelectedPreset("Standard");
  };

  const noteData = useMemo(() => {
    if (!pitch) return null;
    return getNoteData(pitch);
  }, [pitch]);

  const targetStrings = allPresets[selectedPreset] || [];
  const activeTargetIndex = useMemo(() => {
    if (mode === "Free" || !noteData) return null;
    return targetStrings.lastIndexOf(noteData.note);
  }, [mode, noteData, targetStrings]);

  const cents = noteData?.cents || 0;
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const isTuned = Math.abs(cents) <= 5;

  if (showAccount) {
    return (
      <main className="h-[100dvh] overflow-y-auto bg-rosewood">
        <AccountPanel
          user={authUser}
          credits={credits}
          isSubscriber={isSubscriber}
          onByokKeyChange={setByokKey}
          currentSong={null}
          onLoadSavedSong={() => router.push("/chat")}
          onClose={() => setShowAccount(false)}
        />
      </main>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-rosewood selection:bg-brass selection:text-rosewood">
      <Sidebar
        authUser={authUser}
        onOpenAccount={() => setShowAccount(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversationList={[]}
        currentConversationId={null}
        onNewSession={() => router.push("/chat")}
        onOpenConversation={() => router.push("/chat")}
      />

      <div className="flex flex-1 flex-col relative bg-rosewood overflow-y-auto">

        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate bg-rosewood/90 backdrop-blur-sm z-20 shrink-0">
          <span className="font-display text-lg text-parchment">Tuner</span>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-ash hover:text-brass transition-colors active:scale-90"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* FIX: px-6/py-6 was the same on every screen size, eating too
            much vertical space on a phone before you even reach the
            tuner itself. Tightened on mobile, restored at sm+. */}
        <div className="border-b border-slate bg-rosewood/80 backdrop-blur-md px-4 py-4 sm:px-6 sm:py-6 flex flex-col items-center gap-3 sm:gap-4">
          <div className="flex w-full max-w-xs bg-rosewood rounded-lg border border-slate p-1 shadow-inner">
            <button
              onClick={() => setMode("Free")}
              className={`flex-1 px-4 sm:px-6 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-bold tracking-widest uppercase transition-all duration-200 ${mode === "Free" ? "bg-brass text-rosewood shadow-md" : "text-ash hover:text-parchment hover:bg-slate/20"}`}
            >
              Free
            </button>
            <button
              onClick={() => setMode("Guided")}
              className={`flex-1 px-4 sm:px-6 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-bold tracking-widest uppercase transition-all duration-200 ${mode === "Guided" ? "bg-brass text-rosewood shadow-md" : "text-ash hover:text-parchment hover:bg-slate/20"}`}
            >
              Presets
            </button>
          </div>

          <AnimatePresence initial={false}>
            {mode === "Guided" && !isBuilding && (
              <motion.div
                key="preset-row"
                initial={{ opacity: 0, height: 0, marginTop: -16 }}
                animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: -16 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex items-center justify-center gap-2 sm:gap-3 w-full overflow-hidden flex-wrap"
              >
                <div className="relative flex items-center">
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="appearance-none bg-rosewood border border-slate text-parchment text-xs sm:text-sm rounded-lg pl-3 sm:pl-4 pr-9 sm:pr-10 py-2 sm:py-2.5 outline-none focus:border-brass shadow-sm cursor-pointer transition-colors hover:border-brass/60"
                  >
                    <optgroup label="Standard" className="bg-rosewood text-parchment">
                      {Object.keys(DEFAULT_PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
                    </optgroup>
                    {Object.keys(customTunings).length > 0 && (
                      <optgroup label="Custom" className="bg-rosewood text-parchment">
                        {Object.keys(customTunings).map(k => <option key={k} value={k}>{k}</option>)}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 sm:right-3 text-ash pointer-events-none" />
                </div>

                <button
                  onClick={() => setIsBuilding(true)}
                  className="p-2 sm:p-2.5 text-ash hover:text-brass transition-colors bg-rosewood border border-slate rounded-lg shadow-sm hover:border-brass/40 active:scale-90"
                  title="Create custom tuning"
                >
                  <Plus size={16} className="sm:hidden" />
                  <Plus size={18} className="hidden sm:block" />
                </button>

                {customTunings[selectedPreset] && (
                  <button
                    onClick={() => deleteCustomTuning(selectedPreset)}
                    className="p-2 sm:p-2.5 text-rust hover:opacity-80 transition-colors bg-rosewood border border-slate rounded-lg shadow-sm hover:border-rust/40 active:scale-90"
                    title="Delete custom tuning"
                  >
                    <Trash2 size={16} className="sm:hidden" />
                    <Trash2 size={18} className="hidden sm:block" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-3xl mx-auto">

          <AnimatePresence mode="wait">
            {isBuilding ? (
              <motion.div
                key="builder"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="w-full bg-rosewood border border-slate p-5 sm:p-8 rounded-2xl shadow-xl"
              >
                <h2 className="text-lg sm:text-xl font-bold text-parchment mb-4 sm:mb-6">Create Custom Tuning</h2>
                <input
                  type="text"
                  placeholder="Tuning Name (e.g., Open G)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-rosewood border border-slate text-parchment px-4 py-3 rounded-lg mb-6 focus:border-brass outline-none transition-colors"
                />
                {/* FIX: 6 string selects at fixed w-20 also overflow a
                    narrow phone the same way the badges did. Wrap +
                    shrink on mobile, restore fixed row at sm+. */}
                <div className="flex flex-wrap gap-3 mb-8 justify-center sm:justify-between sm:flex-nowrap">
                  {newStrings.map((str, i) => (
                    <div key={i} className="relative flex items-center">
                      <select
                        value={str}
                        onChange={(e) => {
                          const updated = [...newStrings];
                          updated[i] = e.target.value;
                          setNewStrings(updated);
                        }}
                        className="appearance-none bg-rosewood border border-slate text-parchment font-bold text-center pl-3 pr-8 py-3 rounded-lg w-16 sm:w-20 focus:border-brass outline-none cursor-pointer transition-colors"
                      >
                        {NOTES.map(n => <option key={n} value={n} className="bg-rosewood">{n}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 text-ash pointer-events-none" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsBuilding(false)} className="px-6 py-2.5 text-ash hover:text-parchment font-medium transition-colors">Cancel</button>
                  <button onClick={saveCustomTuning} className="px-6 py-2.5 bg-brass text-rosewood font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-md">Save Preset</button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="tuner"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center w-full"
              >
                {/*
                  FIX (the main mobile bug): 6 badges at h-14/w-14 with
                  gap-6 need ~456px of width — wider than almost any
                  phone screen after padding, so they were silently
                  overflowing off the right edge with no way to scroll
                  to them. Smaller badges + smaller gap on mobile, plus
                  flex-wrap as a safety net if a custom tuning ever has
                  more than 6 strings. Full size restored at sm+.
                */}
<div className="flex flex-nowrap justify-center gap-1.5 sm:gap-6 mb-8 sm:mb-16 px-2 w-full">
  {mode === "Guided" && targetStrings.map((str, i) => (
    <TunerStringBadge
      key={i}
      note={str}
      isActive={activeTargetIndex === i}
      isInTune={isTuned}
    />
  ))}
</div>

                {/* FIX: fixed text-[140px] blew way past comfortable
                    size on a phone and pushed the Enable Input button
                    close to (or past) the fold. Scales down on mobile. */}
                <div className="h-28 sm:h-40 flex items-center justify-center mb-4 sm:mb-8">
                  {noteData ? (
                    <span className={`text-7xl sm:text-8xl md:text-[140px] font-bold leading-none transition-colors duration-200 ${isTuned ? 'text-brass drop-shadow-[0_0_15px_rgba(201,138,75,0.35)]' : 'text-parchment'}`}>
                      {noteData.note}
                    </span>
                  ) : (
                    <span className="text-4xl sm:text-6xl font-bold text-slate">--</span>
                  )}
                </div>

                <div className="text-xs sm:text-sm font-mono tracking-widest text-ash mb-4 sm:mb-8 h-6 uppercase">
                  {noteData ? `${cents > 0 ? '+' : ''}${cents} cents` : 'A440 REFERENCE'}
                </div>

                <div className="w-full relative h-16 sm:h-20 mb-8 sm:mb-16 max-w-lg">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate/30 -translate-y-1/2 rounded-full shadow-inner"></div>
                  <div className="absolute top-0 left-1/2 w-0.5 h-full bg-slate -translate-x-1/2 rounded-full"></div>

                  <motion.div
                    animate={{ left: `${isListening ? 50 + clampedCents : 50}%` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className={`absolute top-1/2 w-3 h-10 sm:h-12 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg ${
                      isListening ? (isTuned ? 'bg-brass shadow-[0_0_15px_rgba(201,138,75,0.5)]' : 'bg-parchment') : 'bg-slate'
                    }`}
                  />
                </div>

                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`flex items-center gap-2 sm:gap-3 px-7 sm:px-10 py-3.5 sm:py-4 rounded-full font-bold text-xs sm:text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 ${
                    isListening
                      ? 'bg-transparent border-2 border-slate text-ash hover:text-parchment hover:border-ash hover:bg-slate/10'
                      : 'bg-brass text-rosewood hover:opacity-90 hover:scale-105'
                  }`}
                >
                  {isListening ? <><MicOff size={18} /> Mute Input</> : <><Mic size={18} /> Enable Input</>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}