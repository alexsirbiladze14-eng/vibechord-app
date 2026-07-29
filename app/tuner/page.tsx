"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Plus, Trash2, ChevronDown, Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AccountPanel from "@/components/AccountPanel";
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
      <main className="h-screen overflow-y-auto bg-rosewood">
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
    <div className="flex h-screen w-full overflow-hidden bg-rosewood selection:bg-brass selection:text-rosewood">
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

        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate bg-rosewood z-20">
          <span className="font-display text-lg text-parchment">Tuner</span>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-ash hover:text-parchment transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        <div className="flex items-center justify-between px-8 py-5 border-b border-slate bg-rosewood/80 backdrop-blur-md">
          <div className="flex bg-[#1A1A1A] rounded-lg border border-slate p-1 shadow-inner">
            <button 
              onClick={() => setMode("Free")}
              className={`px-6 py-2 rounded-md text-sm font-bold tracking-widest uppercase transition-all ${mode === "Free" ? "bg-brass text-rosewood shadow-md" : "text-ash hover:text-parchment hover:bg-slate/20"}`}
            >
              Free
            </button>
            <button 
              onClick={() => setMode("Guided")}
              className={`px-6 py-2 rounded-md text-sm font-bold tracking-widest uppercase transition-all ${mode === "Guided" ? "bg-brass text-rosewood shadow-md" : "text-ash hover:text-parchment hover:bg-slate/20"}`}
            >
              Presets
            </button>
          </div>

          {mode === "Guided" && !isBuilding && (
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="appearance-none bg-[#1A1A1A] border border-slate text-parchment text-sm rounded-lg pl-4 pr-10 py-2.5 outline-none focus:border-brass shadow-sm cursor-pointer transition-colors hover:border-slate/80"
                >
                  <optgroup label="Standard" className="bg-[#1A1A1A] text-parchment">
                    {Object.keys(DEFAULT_PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
                  </optgroup>
                  {Object.keys(customTunings).length > 0 && (
                    <optgroup label="Custom" className="bg-[#1A1A1A] text-parchment">
                      {Object.keys(customTunings).map(k => <option key={k} value={k}>{k}</option>)}
                    </optgroup>
                  )}
                </select>
                <ChevronDown size={14} className="absolute right-3 text-ash pointer-events-none" />
              </div>

              <button 
                onClick={() => setIsBuilding(true)} 
                className="p-2.5 text-ash hover:text-brass transition-colors bg-[#1A1A1A] border border-slate rounded-lg shadow-sm hover:border-brass/40"
                title="Create custom tuning"
              >
                <Plus size={18} />
              </button>

              {customTunings[selectedPreset] && (
                <button 
                  onClick={() => deleteCustomTuning(selectedPreset)} 
                  className="p-2.5 text-red-400 hover:text-red-300 transition-colors bg-[#1A1A1A] border border-slate rounded-lg shadow-sm hover:border-red-500/40"
                  title="Delete custom tuning"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-3xl mx-auto">
          
          {isBuilding ? (
            <div className="w-full bg-[#1A1A1A] border border-slate p-8 rounded-2xl shadow-xl">
              <h2 className="text-xl font-bold text-parchment mb-6">Create Custom Tuning</h2>
              <input 
                type="text" 
                placeholder="Tuning Name (e.g., Open G)" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-rosewood border border-slate text-parchment px-4 py-3 rounded-lg mb-6 focus:border-brass outline-none"
              />
              <div className="flex gap-3 mb-8 justify-between">
                {newStrings.map((str, i) => (
                  <div key={i} className="relative flex items-center">
                    <select 
                      value={str}
                      onChange={(e) => {
                        const updated = [...newStrings];
                        updated[i] = e.target.value;
                        setNewStrings(updated);
                      }}
                      className="appearance-none bg-rosewood border border-slate text-parchment font-bold text-center pl-3 pr-8 py-3 rounded-lg w-20 focus:border-brass outline-none cursor-pointer"
                    >
                      {NOTES.map(n => <option key={n} value={n} className="bg-rosewood">{n}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 text-ash pointer-events-none" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsBuilding(false)} className="px-6 py-2.5 text-ash hover:text-parchment font-medium">Cancel</button>
                <button onClick={saveCustomTuning} className="px-6 py-2.5 bg-brass text-rosewood font-bold rounded-lg hover:bg-brass/90 shadow-md">Save Preset</button>
              </div>
            </div>
          ) : (
            <>
              {mode === "Guided" && (
                <div className="flex gap-6 mb-16">
                  {targetStrings.map((str, i) => (
                    <div 
                      key={i} 
                      className={`w-14 h-14 flex items-center justify-center rounded-full text-xl font-bold transition-all duration-300 ${
                        activeTargetIndex === i 
                          ? (isTuned ? 'bg-brass text-rosewood scale-110 shadow-[0_0_25px_rgba(234,179,8,0.4)]' : 'bg-slate text-parchment scale-110 shadow-lg') 
                          : 'bg-[#1A1A1A] border-2 border-slate text-ash'
                      }`}
                    >
                      {str}
                    </div>
                  ))}
                </div>
              )}

              <div className="h-40 flex items-center justify-center mb-8">
                {noteData ? (
                  <span className={`text-[140px] font-bold leading-none transition-colors duration-200 ${isTuned ? 'text-brass drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-parchment'}`}>
                    {noteData.note}
                  </span>
                ) : (
                  <span className="text-6xl font-bold text-slate">--</span>
                )}
              </div>

              <div className="text-sm font-mono tracking-widest text-ash mb-8 h-6 uppercase">
                {noteData ? `${cents > 0 ? '+' : ''}${cents} cents` : 'A440 REFERENCE'}
              </div>

              <div className="w-full relative h-20 mb-16 max-w-lg">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-[#1A1A1A] -translate-y-1/2 rounded-full shadow-inner"></div>
                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-slate -translate-x-1/2 rounded-full"></div>
                
                <div 
                  className={`absolute top-1/2 w-3 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-100 ease-out shadow-lg ${
                    isListening ? (isTuned ? 'bg-brass shadow-[0_0_15px_rgba(234,179,8,0.6)]' : 'bg-parchment') : 'bg-slate'
                  }`}
                  style={{ left: `${isListening ? 50 + clampedCents : 50}%` }}
                ></div>
              </div>

              <button
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center gap-3 px-10 py-4 rounded-full font-bold text-sm uppercase tracking-widest transition-all shadow-md ${
                  isListening 
                    ? 'bg-transparent border-2 border-slate text-ash hover:text-parchment hover:border-ash hover:bg-slate/10' 
                    : 'bg-brass text-rosewood hover:bg-brass/90 hover:scale-105'
                }`}
              >
                {isListening ? <><MicOff size={18} /> Mute Input</> : <><Mic size={18} /> Enable Input</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}