"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { handleToneyIntent } from "@/lib/toneyClientRouter";
import { getDiatonicChords, type ModeName } from "@/lib/musicTheory";
import type { Artifact } from "@/lib/artifacts";
import type { ToneyMessage } from "@/components/ToneyChat";
import type { Mode, SkillLevel } from "@/components/KeySelector";
import type { QuizQuestion } from "@/lib/quiz";
import type { TuningName } from "@/lib/musicTheory";
import {
  listConversations,
  loadConversation,
  createConversation,
  updateConversation,
  titleFromFirstMessage,
  type ConversationSummary,
} from "@/lib/conversations";

export type AuthUser = { id: string; email: string };

const MODE_TO_ENGINE: Record<Mode, ModeName> = {
  Major: "major",
  Minor: "minor",
  Dorian: "dorian",
  Mixolydian: "mixolydian",
};

export function useToneyConversation() {
  const [musicKey, setMusicKey] = useState("E");
  const [defaultMode, setDefaultMode] = useState<Mode>("Minor");
  const [skill, setSkill] = useState<SkillLevel>("Beginner");
  const [tuning, setTuning] = useState<TuningName>("Standard");

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showingAll, setShowingAll] = useState(false);
  const activeArtifact = activeIndex !== null ? artifacts[activeIndex] : null;

  const [chatMessages, setChatMessages] = useState<ToneyMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [byokKey, setByokKey] = useState("");

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
      setIsSubscriber(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("credits, subscription_status")
      .eq("id", authUser.id)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setCredits(data.credits as number);
        setIsSubscriber(data.subscription_status === "active");
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      setConversationList([]);
      return;
    }
    let cancelled = false;
    listConversations(authUser.id).then((list) => {
      if (!cancelled) setConversationList(list);
    });
    return () => {
      cancelled = true;
    };
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
            .sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )
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
      return { ok: false, message: "Out of credits — check the Account panel to buy more." };
    }
    
    setCredits(data as number);
    return { ok: true };
  }

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

  async function handleToneySend(text: string) {
    pushMessage({ role: "user", text });

    const spend = await spendCredit();
    if (!spend.ok) {
      pushMessage({ role: "assistant", text: spend.message ?? "Out of credits.", animate: true });
      return;
    }

    setIsSending(true);
    try {
      const activeProgressionSummary =
        activeArtifact?.kind === "progression"
          ? {
              name: activeArtifact.name,
              chordNames: activeArtifact.degrees.map(
                (d) => getDiatonicChords(activeArtifact.musicKey, MODE_TO_ENGINE[activeArtifact.mode])[d].name
              ),
              keyLabel: activeArtifact.musicKey,
              modeLabel: activeArtifact.mode,
            }
          : null;

      const res = await fetch("/api/toney", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatMessages.map(({ animate, ...rest }) => rest),
          hasActiveProgression: activeArtifact?.kind === "progression",
          activeProgressionSummary,
          currentKey: musicKey,
          currentSkill: skill,
          userId: authUser?.id ?? null,
          byokKey,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      handleToneyIntent({
        data,
        text,
        musicKey,
        defaultMode,
        activeArtifact,
        setDefaultMode,
        setMusicKey,
        setSkill,
        pushArtifact,
        pushMessage,
        startQuiz: setQuizQuestions,
      });

    } catch (err) {
      pushMessage({
        role: "assistant",
        text: err instanceof Error ? err.message : "Something went wrong.",
        animate: true
      });
    } finally {
      setIsSending(false);
    }
  }

  function onQuizRequest() {
    handleToneySend("Quiz me on this progression!");
  }

  function onQuizFinish() {
    setQuizQuestions(null);
  }

  function handleNewSession() {
    setChatMessages([]);
    setArtifacts([]);
    setActiveIndex(null);
    setShowingAll(false);
    setQuizQuestions(null);
    setCurrentConversationId(null);
    setMusicKey("E");
    setDefaultMode("Minor");
    setSkill("Beginner");
  }

  async function handleOpenConversation(id: string) {
    const convo = await loadConversation(id);
    if (!convo) return;
    setCurrentConversationId(convo.id);
    setChatMessages(convo.messages);
    setArtifacts(convo.artifacts);
    setActiveIndex(convo.active_artifact_index);
    setShowingAll(false);
    setQuizQuestions(null);
  }

  return {
    state: {
      musicKey, defaultMode, skill, tuning,
      artifacts, activeIndex, showingAll, activeArtifact,
      chatMessages, isSending,
      authUser, credits, byokKey,
      isSubscriber,
      quizQuestions,
      conversationList, currentConversationId,
    },
    setters: {
      setMusicKey, setDefaultMode, setSkill, setTuning,
      setActiveIndex, setShowingAll, setByokKey,
      setQuizQuestions,
    },
    actions: {
      spendCredit, pushArtifact, pushMessage, handleToneySend,
      onQuizRequest, onQuizFinish,
      handleNewSession, handleOpenConversation,
    }
  };
}