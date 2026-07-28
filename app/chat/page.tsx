"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, MessageSquare, LogIn, Crown, Settings, LogOut } from "lucide-react";
import ToneyChat, { type ToneyMessage } from "@/components/ToneyChat";
import ArtifactPanel from "@/components/ArtifactPanel";
import AccountPanel from "@/components/AccountPanel";
import type { Mode, SkillLevel } from "@/components/KeySelector";
import type { SavedSong } from "@/components/SavedSongs";
import { supabase } from "@/lib/supabaseClient";
import {
  getDiatonicChords,
  getPentatonicNotes,
  getFretPositions,
  type ModeName,
} from "@/lib/musicTheory";
import { selectProgression, sanitizeTags } from "@/lib/selectProgression";
import type { ModeName as ProgressionModeName } from "@/lib/progressions";
import { harmonizeMelody } from "@/lib/harmonize";
import { applyRefinement, REFINEMENT_INTENTS, type RefinementIntent } from "@/lib/refine";
import { sanitizeToneMatchResult } from "@/lib/toneMatch";
import { makeArtifactId, type Artifact, type ProgressionArtifact } from "@/lib/artifacts";
import type { QuizQuestion } from "@/lib/quiz";
import {
  listConversations,
  loadConversation,
  createConversation,
  updateConversation,
  titleFromFirstMessage,
  type ConversationSummary,
} from "@/lib/conversations";

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

type QuizState = {
  questions: QuizQuestion[];
  currentIndex: number;
  correctCount: number;
};

function matchQuizAnswer(userText: string, options: string[]): number | null {
  const trimmed = userText.trim().toLowerCase();
  const shorthand: Record<string, number> = { a: 0, b: 1, c: 2, "1": 0, "2": 1, "3": 2 };
  if (trimmed in shorthand) return shorthand[trimmed];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i].toLowerCase();
    if (opt === trimmed) return i;
  }
  for (let i = 0; i < options.length; i++) {
    const opt = options[i].toLowerCase();
    if (trimmed.length > 2 && (opt.includes(trimmed) || trimmed.includes(opt))) return i;
  }
  return null;
}

function askQuizQuestion(q: QuizQuestion, index: number, total: number): string {
  const letters = ["A", "B", "C"];
  const optionsText = q.options.map((o, i) => `${letters[i]}) ${o}`).join("  ");
  return `Question ${index + 1}/${total}: ${q.question}\n${optionsText}`;
}

type AuthUser = { id: string; email: string };

export default function ChatApp() {
  const [musicKey, setMusicKey] = useState<string | null>(null);
  const [skill, setSkill] = useState<SkillLevel | null>(null);
  const [defaultMode, setDefaultMode] = useState<Mode>("Minor");

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showingAll, setShowingAll] = useState(false);

  const [chatMessages, setChatMessages] = useState<ToneyMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [quizState, setQuizState] = useState<QuizState | null>(null);

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [byokKey, setByokKey] = useState("");
  const [showAccount, setShowAccount] = useState(false);

  const [conversationList, setConversationList] = useState<ConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

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
      setConversationList([]);
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
    listConversations(authUser.id).then(setConversationList);
  }, [authUser]);

  useEffect(() => {
    if (!authUser || chatMessages.length === 0) return;
    const timeoutId = setTimeout(async () => {
      if (!currentConversationId) {
        const title = titleFromFirstMessage(chatMessages[0]?.text ?? "");
        const newId = await createConversation(
          authUser.id,
          title,
          chatMessages,
          artifacts,
          activeIndex
        );
        if (newId) {
          setCurrentConversationId(newId);
          setConversationList((prev) => [
            { id: newId, title, updated_at: new Date().toISOString() },
            ...prev,
          ]);
        }
      } else {
        await updateConversation(currentConversationId, {
          messages: chatMessages,
          artifacts,
          activeArtifactIndex: activeIndex,
        });
        setConversationList((prev) =>
          [...prev]
            .map((c) =>
              c.id === currentConversationId
                ? { ...c, updated_at: new Date().toISOString() }
                : c
            )
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        );
      }
    }, 800);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages, artifacts, activeIndex, authUser, currentConversationId]);

  async function spendCredit(): Promise<{ ok: boolean; message?: string }> {
    if (byokKey) return { ok: true };
    if (!authUser) return { ok: true };
    const { data, error } = await supabase.rpc("spend_credit", { uid: authUser.id });
    if (error) return { ok: false, message: "Couldn't check credits — try again." };
    if (data === null) {
      return { ok: false, message: "Out of credits — visit the Premium page to get more." };
    }
    setCredits(data as number);
    return { ok: true };
  }

  const activeArtifact = activeIndex !== null ? artifacts[activeIndex] : null;

  const progressionView = useMemo(() => {
    if (!activeArtifact || activeArtifact.kind !== "progression") return null;
    const a = activeArtifact as ProgressionArtifact;
    const engineMode = MODE_TO_ENGINE[a.mode];
    const allChords = getDiatonicChords(a.musicKey, engineMode);
    const displayedChords = a.degrees.map((d) => allChords[d]);
    const pentatonicNotes = getPentatonicNotes(a.musicKey, engineMode);
    const fretPositions = getFretPositions(pentatonicNotes, a.musicKey);
    const pentatonicLabel =
      engineMode === "major" || engineMode === "mixolydian"
        ? `${a.musicKey} Major Pentatonic`
        : `${a.musicKey} Minor Pentatonic`;
    const effectiveChords = showingAll ? allChords : displayedChords;
    const effectiveDegrees = showingAll ? allChords.map((_, i) => i) : a.degrees;
    return {
      allChords,
      displayedChords,
      effectiveChords,
      effectiveDegrees,
      fretPositions,
      pentatonicNotes,
      pentatonicLabel,
      engineMode,
      musicKey: a.musicKey,
      showingAll,
      onResetToAll: () => setShowingAll(true),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeArtifact, showingAll]);

  const currentSongForSaving =
    activeArtifact?.kind === "progression"
      ? {
          name: activeArtifact.name,
          musicKey: activeArtifact.musicKey,
          mode: activeArtifact.mode,
          degrees: activeArtifact.degrees,
        }
      : null;

  function pushArtifact(a: Artifact) {
    setArtifacts((prev) => {
      const next = [...prev, a];
      setActiveIndex(next.length - 1);
      return next;
    });
    setShowingAll(false);
  }

  function pushMessage(msg: ToneyMessage) {
    setChatMessages((prev) => [...prev, msg]);
  }

  function handleSelectIndex(i: number) {
    setActiveIndex(i);
    setShowingAll(false);
  }

  function handleNewSession() {
    setChatMessages([]);
    setArtifacts([]);
    setActiveIndex(null);
    setShowingAll(false);
    setCurrentConversationId(null);
    setMusicKey(null);
    setSkill(null);
    setDefaultMode("Minor");
    setQuizState(null);
  }

  async function handleOpenConversation(id: string) {
    const convo = await loadConversation(id);
    if (!convo) return;
    setCurrentConversationId(convo.id);
    setChatMessages(convo.messages);
    setArtifacts(convo.artifacts);
    setActiveIndex(convo.active_artifact_index);
    setShowingAll(false);
    setQuizState(null);
    setMusicKey(null);
    setSkill(null);
  }

  function handleMelodyDetected(notes: string[]) {
    const keyToUse = musicKey ?? "E";
    const modeToUse = defaultMode;
    const engineMode = MODE_TO_ENGINE[modeToUse];
    const result = harmonizeMelody(notes, keyToUse, engineMode);
    const artifact: ProgressionArtifact = {
      kind: "progression",
      id: makeArtifactId(),
      createdAt: Date.now(),
      name: "Chords under your riff",
      explanation: result.explanation,
      degrees: result.degrees,
      source: "melody",
      detail: null,
      genre: null,
      musicKey: keyToUse,
      mode: modeToUse,
    };
    pushArtifact(artifact);
    pushMessage({ role: "user", text: "🎤 Hummed a melody" });
    pushMessage({ role: "assistant", text: result.explanation });
  }

  function handleLoadSavedSong(song: SavedSong) {
    const artifact: ProgressionArtifact = {
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
    };
    pushArtifact(artifact);
    pushMessage({ role: "assistant", text: `Loaded "${song.name}" from your saved songs.` });
  }

  async function handleToneySend(text: string) {
    pushMessage({ role: "user", text });

    if (quizState) {
      const current = quizState.questions[quizState.currentIndex];
      const matched = matchQuizAnswer(text, current.options);

      if (matched === null) {
        pushMessage({
          role: "assistant",
          text: "Not sure which option that was — answer with A, B, or C!",
        });
        return;
      }

      const isCorrect = matched === current.correctIndex;
      const nextCorrectCount = quizState.correctCount + (isCorrect ? 1 : 0);
      const feedback = isCorrect
        ? "Correct! 🎸"
        : `Not quite — the answer was ${["A", "B", "C"][current.correctIndex]}) ${
            current.options[current.correctIndex]
          }.`;

      const nextIndex = quizState.currentIndex + 1;
      if (nextIndex >= quizState.questions.length) {
        pushMessage({
          role: "assistant",
          text: `${feedback} That's the quiz — you got ${nextCorrectCount}/${quizState.questions.length}. Nice work!`,
        });
        setQuizState(null);
      } else {
        pushMessage({
          role: "assistant",
          text: `${feedback}\n\n${askQuizQuestion(
            quizState.questions[nextIndex],
            nextIndex,
            quizState.questions.length
          )}`,
        });
        setQuizState({ ...quizState, currentIndex: nextIndex, correctCount: nextCorrectCount });
      }
      return;
    }

    const spend = await spendCredit();
    if (!spend.ok) {
      pushMessage({ role: "assistant", text: spend.message ?? "Out of credits." });
      return;
    }

    setIsSending(true);
    try {
      const activeProgressionSummary =
        activeArtifact?.kind === "progression" && progressionView
          ? {
              name: activeArtifact.name,
              chordNames: progressionView.effectiveChords.map((c) => c.name),
              keyLabel: progressionView.musicKey,
              modeLabel: activeArtifact.mode,
            }
          : null;

      const res = await fetch("/api/toney", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatMessages,
          hasActiveProgression: activeArtifact?.kind === "progression",
          activeProgressionSummary,
          currentKey: musicKey,
          currentSkill: skill,
          byokKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      const effectiveKey = typeof data.key === "string" ? data.key : musicKey;
      const effectiveSkill: SkillLevel | null =
        typeof data.skillLevel === "string" ? (data.skillLevel as SkillLevel) : skill;
      if (effectiveKey !== musicKey) setMusicKey(effectiveKey);
      if (effectiveSkill !== skill) setSkill(effectiveSkill);

      const intent = data.intent as string;

      if (intent === "generate") {
        const keyForThisSong = effectiveKey ?? "E";
        const tags = sanitizeTags({ genre: data.genre, mood: data.mood, energy: data.energy });
        const match = selectProgression(tags, [], MODE_TO_ENGINE[defaultMode]);
        const newMode = ENGINE_TO_MODE[match.requiredMode];
        setDefaultMode(newMode);
        const artifact: ProgressionArtifact = {
          kind: "progression",
          id: makeArtifactId(),
          createdAt: Date.now(),
          name: match.name,
          explanation: match.explanation,
          degrees: match.degrees,
          source: "vibe",
          detail: text,
          genre: tags.genre,
          musicKey: keyForThisSong,
          mode: newMode,
        };
        pushArtifact(artifact);
        pushMessage({ role: "assistant", text: data.reply || `Here's "${match.name}" for you.` });
      } else if (intent === "refine") {
        if (!activeArtifact || activeArtifact.kind !== "progression") {
          pushMessage({
            role: "assistant",
            text: "There's nothing to refine yet — ask me for a vibe first!",
          });
        } else {
          const refineIntent = data.refineIntent as RefinementIntent;
          if (!REFINEMENT_INTENTS.includes(refineIntent)) {
            pushMessage({
              role: "assistant",
              text:
                data.reply ||
                "Try 'darker', 'brighter', 'simpler', 'more tension', or 'something different'.",
            });
          } else {
            const result = applyRefinement(
              refineIntent,
              activeArtifact.degrees,
              MODE_TO_ENGINE[activeArtifact.mode],
              activeArtifact.name
            );
            if (!result.applied) {
              pushMessage({ role: "assistant", text: result.message });
            } else {
              const newMode = ENGINE_TO_MODE[result.mode];
              setDefaultMode(newMode);
              const artifact: ProgressionArtifact = {
                kind: "progression",
                id: makeArtifactId(),
                createdAt: Date.now(),
                name: result.name,
                explanation: result.explanation,
                degrees: result.degrees,
                source: "refine",
                detail: null,
                genre: activeArtifact.genre,
                musicKey: activeArtifact.musicKey,
                mode: newMode,
              };
              pushArtifact(artifact);
              pushMessage({ role: "assistant", text: data.reply || result.explanation });
            }
          }
        }
      } else if (intent === "tone_match") {
        const sanitized = sanitizeToneMatchResult({
          description: data.toneDescription,
          preset: data.tonePreset,
          followUpQuestion: data.toneFollowUpQuestion,
        });
        if (!sanitized) {
          pushMessage({
            role: "assistant",
            text:
              data.reply ||
              "Tell me an artist or song, or the gear you have, and I'll dial something in.",
          });
        } else {
          const artifact = {
            kind: "tone" as const,
            id: makeArtifactId(),
            createdAt: Date.now(),
            query: text,
            description: sanitized.description,
            preset: sanitized.preset,
            followUpQuestion: sanitized.followUpQuestion,
          };
          pushArtifact(artifact);
          const replyText = [data.reply, sanitized.followUpQuestion].filter(Boolean).join(" ");
          pushMessage({ role: "assistant", text: replyText || sanitized.description });
        }
      } else if (intent === "quiz") {
        const questions = Array.isArray(data.quizQuestions) ? data.quizQuestions : [];
        if (!activeArtifact || activeArtifact.kind !== "progression" || questions.length === 0) {
          pushMessage({
            role: "assistant",
            text:
              data.reply ||
              "Generate a progression first, then I can quiz you on it!",
          });
        } else {
          setQuizState({ questions, currentIndex: 0, correctCount: 0 });
          const intro = data.reply || "Let's see what you've got!";
          pushMessage({
            role: "assistant",
            text: `${intro}\n\n${askQuizQuestion(questions[0], 0, questions.length)}`,
          });
        }
      } else {
        pushMessage({
          role: "assistant",
          text: data.reply || "Not sure I follow — ask me for a vibe, a refinement, or a tone!",
        });
      }
    } catch (err) {
      pushMessage({
        role: "assistant",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    handleNewSession();
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-rosewood">
      {showAccount && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-rosewood">
          <AccountPanel
            user={authUser}
            credits={credits}
            onByokKeyChange={setByokKey}
            currentSong={currentSongForSaving}
            onLoadSavedSong={(song) => {
              handleLoadSavedSong(song);
              setShowAccount(false);
            }}
            onClose={() => setShowAccount(false)}
          />
        </div>
      )}

      {/* Left Sidebar */}
      <aside className="flex w-64 flex-col border-r border-slate bg-rosewood shadow-xl z-20 shrink-0">
        <div className="flex items-center justify-center overflow-hidden border-b border-slate h-36 w-full">
          <div className="relative h-full w-full scale-[1.8]">
            <Image src="/logo.png" alt="Vibechord with Toney" fill className="object-contain" priority />
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={handleNewSession}
            className="flex w-full items-center gap-2 rounded-md bg-brass px-4 py-2.5 text-sm font-medium text-rosewood transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            New Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <p className="px-2 pb-2 pt-2 text-xs font-semibold text-ash">History</p>
          {!authUser && (
            <p className="px-2 text-xs leading-relaxed text-ash/70">
              Log in to save and revisit past conversations.
            </p>
          )}
          {authUser && conversationList.length === 0 && (
            <p className="px-2 text-xs leading-relaxed text-ash/70">
              Nothing yet — your first chat will show up here.
            </p>
          )}
          {authUser &&
            conversationList.map((c) => (
              <button
                key={c.id}
                onClick={() => handleOpenConversation(c.id)}
                className={`flex w-full items-center gap-2 truncate rounded-md p-2 text-sm transition-colors ${
                  c.id === currentConversationId
                    ? "bg-slate/40 text-parchment"
                    : "text-ash hover:bg-slate/30 hover:text-parchment"
                }`}
              >
                <MessageSquare size={16} className="shrink-0" />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
        </div>

        <div className="border-t border-slate p-4 space-y-2">
          {authUser && (
            <p className="truncate px-2 text-xs text-ash">
              {authUser.email} {credits !== null && `· ${credits} credits`}
            </p>
          )}
          <Link
            href="/premium"
            className="flex w-full items-center gap-3 rounded-md p-2 text-sm text-brass transition-colors hover:bg-slate/30"
          >
            <Crown size={18} />
            Upgrade to Premium
          </Link>
          <button
            onClick={() => setShowAccount(true)}
            className="flex w-full items-center gap-3 rounded-md p-2 text-sm text-ash transition-colors hover:bg-slate/30 hover:text-parchment"
          >
            <Settings size={18} />
            Settings
          </button>
          {authUser ? (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-md p-2 text-sm text-ash transition-colors hover:bg-slate/30 hover:text-parchment"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="flex w-full items-center gap-3 rounded-md p-2 text-sm text-ash transition-colors hover:bg-slate/30 hover:text-parchment"
            >
              <LogIn size={18} />
              Log In
            </Link>
          )}
        </div>
      </aside>

      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`h-full transition-[width] duration-700 ease-in-out shrink-0 flex flex-col ${
            activeArtifact ? "w-1/2 border-r border-slate" : "w-full"
          }`}
        >
          <ToneyChat
            messages={chatMessages}
            onSend={handleToneySend}
            isSending={isSending}
            onMelodyDetected={handleMelodyDetected}
          />
        </div>

        <div
          className={`h-full transition-[width,opacity] duration-700 ease-in-out shrink-0 overflow-hidden bg-rosewood ${
            activeArtifact ? "w-1/2 opacity-100" : "w-0 opacity-0 border-none"
          }`}
        >
          <div className="min-w-[400px] w-full h-full">
            <ArtifactPanel
              artifacts={artifacts}
              activeIndex={activeIndex}
              onSelectIndex={handleSelectIndex}
              skill={skill ?? "Beginner"}
              byokKey={byokKey}
              onBeforeQuiz={spendCredit}
              progressionView={progressionView}
            />
          </div>
        </div>
      </div>
    </div>
  );
}