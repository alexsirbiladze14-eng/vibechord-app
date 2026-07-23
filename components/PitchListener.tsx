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
  const [detectedNotes, setDetectedNotes] = useState<string[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(LISTEN_SECONDS);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);
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
        setDetectedNotes(updated);
      }
    } else {
      setCurrentNote(null);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  async function startListening() {
    setMicError(null);
    setDetectedNotes([]);
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
      setMicError(
        "Couldn't access your microphone. Check your browser's site permissions and try again."
      );
    }
  }

  // Auto-stop after LISTEN_SECONDS so this can't run forever if the user
  // forgets about it, and so the leftover mic indicator doesn't linger.
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

  // Release the microphone if the component unmounts mid-recording —
  // otherwise the browser's "mic is active" indicator stays on.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  return (
    <div className="rounded-lg border border-slate bg-rosewood/60 p-6">
      <h2 className="font-display text-xl text-parchment mb-1">
        Hum or play a riff
      </h2>
      <p className="text-sm text-ash mb-4">
        Sing, hum, or play a short melody into your mic. We'll detect the
        notes and suggest real diatonic chords underneath — no AI, just
        pitch math matched against the key/mode above.
      </p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors ${
            isListening
              ? "bg-rust text-parchment animate-pulse"
              : "bg-brass text-rosewood hover:opacity-90"
          }`}
          aria-pressed={isListening}
          aria-label={isListening ? "Stop listening" : "Start listening"}
        >
          {isListening ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

        <div className="flex-1">
          {isListening ? (
            <p className="font-mono text-sm text-brass">
              Listening… {secondsLeft}s left
              {currentNote && (
                <span className="ml-2 text-parchment">— {currentNote}</span>
              )}
            </p>
          ) : (
            <p className="font-mono text-sm text-ash">
              {detectedNotes.length > 0
                ? "Done — see the notes below."
                : "Tap to start (auto-stops after 8 seconds)."}
            </p>
          )}
        </div>
      </div>

      {micError && <p className="mt-3 text-xs text-rust">{micError}</p>}

      {detectedNotes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {detectedNotes.map((note, i) => (
            <span
              key={i}
              className="rounded-md bg-slate/40 px-2 py-1 font-mono text-xs text-parchment"
            >
              {note}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
