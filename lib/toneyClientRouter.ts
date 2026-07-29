import { selectProgression, sanitizeTags } from "@/lib/selectProgression";
import { applyRefinement, REFINEMENT_INTENTS, type RefinementIntent } from "@/lib/refine";
import { sanitizeToneMatchResult } from "@/lib/toneMatch";
import { makeArtifactId, type ProgressionArtifact, type Artifact } from "@/lib/artifacts";
import type { Mode, SkillLevel } from "@/components/KeySelector";
import type { ModeName as ProgressionModeName } from "@/lib/progressions";
import type { ModeName } from "@/lib/musicTheory";
import type { ToneyMessage } from "@/components/ToneyChat";
import type { QuizQuestion } from "@/lib/quiz"; // Required for the quiz module

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

type RouterParams = {
  data: any; 
  text: string; 
  musicKey: string;
  defaultMode: Mode;
  activeArtifact: Artifact | null;
  setDefaultMode: (mode: Mode) => void;
  setMusicKey: (key: string) => void;
  setSkill: (skill: SkillLevel) => void;
  pushArtifact: (artifact: Artifact) => void;
  pushMessage: (msg: ToneyMessage) => void;
  startQuiz: (questions: QuizQuestion[]) => void;
};

export function handleToneyIntent({
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
  startQuiz,
}: RouterParams) {
  
  // 1. Conversational State Extraction
  if (data.key) {
    setMusicKey(data.key as string);
  }
  if (data.skillLevel) {
    setSkill(data.skillLevel as SkillLevel);
  }

  // 2. Clarification Guard: Strict State Gating
  const isExplicitlyClarifying = 
    data.isClarifying === true || 
    data.needsClarification === true || 
    data.intent === "clarify";

  // Enforce gating if the AI attempts to generate without having the necessary parameters
  const isMissingRequiredState = 
    data.intent === "generate" && 
    (!data.key && !musicKey); // Prevents premature rendering if the key hasn't been established

  if (isExplicitlyClarifying || isMissingRequiredState) {
    if (data.reply) {
      pushMessage({ role: "assistant", text: data.reply, animate: true });
    }
    return; // Router stops here: Artifact panel stays empty until all state parameters are finalized
  }

  const intent = data.intent as string;

  // 3. Intent Routing
  if (intent === "generate") {
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
      musicKey: data.key || musicKey,
      mode: newMode,
    };
    
    pushArtifact(artifact);
    pushMessage({ role: "assistant", text: data.reply || `Here's "${match.name}" for you.`, animate: true });
  
  } else if (intent === "refine") {
    if (!activeArtifact || activeArtifact.kind !== "progression") {
      pushMessage({
        role: "assistant",
        text: "There's nothing to refine yet — ask me for a vibe first!",
        animate: true
      });
      return;
    }

    const refineIntent = data.refineIntent as RefinementIntent;
    
    if (!REFINEMENT_INTENTS.includes(refineIntent)) {
      pushMessage({
        role: "assistant",
        text: data.reply || "Try 'darker', 'brighter', 'simpler', 'more tension', or 'something different'.",
        animate: true
      });
      return;
    }

    const result = applyRefinement(
      refineIntent,
      activeArtifact.degrees,
      MODE_TO_ENGINE[activeArtifact.mode],
      activeArtifact.name
    );

    if (!result.applied) {
      pushMessage({ role: "assistant", text: result.message, animate: true });
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
      pushMessage({ role: "assistant", text: data.reply || result.explanation, animate: true });
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
        text: data.reply || "Tell me an artist or song, or the gear you have, and I'll dial something in.",
        animate: true
      });
    } else {
      const artifact: Artifact = {
        kind: "tone",
        id: makeArtifactId(),
        createdAt: Date.now(),
        query: text,
        description: sanitized.description,
        preset: sanitized.preset,
        followUpQuestion: sanitized.followUpQuestion,
      };
      
      pushArtifact(artifact);
      
      const replyText = [data.reply, sanitized.followUpQuestion]
        .filter(Boolean)
        .join(" ");
      pushMessage({ role: "assistant", text: replyText || sanitized.description, animate: true });
    }
  
  } else if (intent === "quiz") {
    if (!activeArtifact || activeArtifact.kind !== "progression") {
      pushMessage({
        role: "assistant",
        text: "We need an active chord progression first before I can quiz you on it!",
        animate: true
      });
      return;
    }

    if (data.quizQuestions && Array.isArray(data.quizQuestions) && data.quizQuestions.length > 0) {
      startQuiz(data.quizQuestions);
      pushMessage({ 
        role: "assistant", 
        text: data.reply || "Let's test your theory knowledge. Check the panel!", 
        animate: true 
      });
    } else {
      pushMessage({
        role: "assistant",
        text: "I couldn't put a quiz together right now. Try asking again.",
        animate: true
      });
    }

  } else {
    pushMessage({
      role: "assistant",
      text: data.reply || "Not sure I follow — ask me for a vibe, a refinement, or a tone!",
      animate: true
    });
  }
}