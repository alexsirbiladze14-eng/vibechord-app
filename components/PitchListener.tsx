"use client";

import { useEffect, useRef, useState } from "react";
import { autoCorrelate, frequencyToNote } from "@/lib/pitchDetection";

type Props = {
  onMelodyDetected: (notes: string[]) => void;
};

const MAX_NOTES = 16;
const LISTEN_SECONDS = 8;

export default function PitchListener({ onMelodyDetected }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(LISTEN_SECONDS);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
 const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const listeningRef = useRef(false);
  const notesRef = useRef<string[]>([]);

  function stopListening() {
    listeningRef.current = false;
    setIsListening(false);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioContextRef.current = null;
    setCurrentNote(null);
    if (notesRef.current.length > 0) {
      onMelodyDetected(notesRef.current);
    }
  }

  function tick() {
    if (!listeningRef.current) return;
    const analyser = analyserRef.current;
    const buffer = bufferRef.current;
    const audioContext = audioContextRef.current;
    if (!analyser || !buffer || !audioContext) return;

    analyser.getFloatTimeDomainData(buffer);
    const freq = autoCorrelate(buffer, audioContext.sampleRate);

    if (freq !== -1) {
      const note = frequencyToNote(freq);
      const noteStr = `${note.name}${note.octave}`;
      setCurrentNote(noteStr);

      const last = notesRef.current[notesRef.current.length - 1];
      if (last !== noteStr) {
        const updated = [...notesRef.current, noteStr].slice(-MAX_NOTES);
        notesRef.current = updated;
      }
    } else {
      setCurrentNote(null);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  async function startListening() {
    setMicError(null);
    notesRef.current = [];
    setSecondsLeft(LISTEN_SECONDS);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);

      listeningRef.current = true;
      setIsListening(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setMicError("Mic error");
    }
  }

  useEffect(() => {
    if (!isListening) return;
    if (secondsLeft <= 0) {
      stopListening();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, secondsLeft]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop listening" : "Hum or play a melody"}
        title={
          isListening
            ? `Listening (${secondsLeft}s left)`
            : micError || "Hum or play a riff"
        }
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
          isListening
            ? "bg-brass/20 text-brass ring-2 ring-brass animate-pulse"
            : "text-brass hover:bg-slate/30"
        }`}
      >
        {isListening ? (
          /* Stop icon when active */
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          /* Mic icon when idle */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
            <path
              d="M5 11a7 7 0 0014 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="18"
              x2="12"
              y2="22"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="22"
              x2="16"
              y2="22"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {/* Subtle feedback tooltip floating right above the mic icon while recording */}
      {isListening && (
        <div className="absolute bottom-12 left-0 whitespace-nowrap rounded-md border border-slate bg-rosewood px-2.5 py-1 text-[11px] font-mono text-parchment shadow-lg animate-in fade-in">
          Listening… {secondsLeft}s {currentNote && <span className="text-brass">({currentNote})</span>}
        </div>
      )}
    </div>
  );
}