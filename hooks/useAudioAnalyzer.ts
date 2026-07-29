"use client";

import { useState, useEffect, useRef } from "react";

export function useAudioAnalyzer() {
  const [pitch, setPitch] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      analyzerRef.current = audioCtxRef.current.createAnalyser();
      analyzerRef.current.fftSize = 2048;

      const source = audioCtxRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      setIsListening(true);
      tick();
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const stopListening = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    setIsListening(false);
    setPitch(null);
  };

  const tick = () => {
    if (!analyzerRef.current || !audioCtxRef.current) return;
    const buffer: Float32Array<ArrayBuffer> = new Float32Array(analyzerRef.current.fftSize);
    analyzerRef.current.getFloatTimeDomainData(buffer);
    
    // RMS Noise Gate: ignore background ambient room noise so notes don't flash randomly
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    if (rms < 0.015) {
      setPitch(null);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const sampleRate = audioCtxRef.current.sampleRate;
    const detectedPitch = autoCorrelate(buffer, sampleRate);
    
    if (detectedPitch !== -1 && detectedPitch > 40 && detectedPitch < 2000) {
      setPitch(detectedPitch);
    } else {
      setPitch(null);
    }
    
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return stopListening;
  }, []);

  return { pitch, isListening, startListening, stopListening };
}
function autoCorrelate(buffer: Float32Array<ArrayBuffer>, sampleRate: number) {
  let r1 = 0, r2 = buffer.length - 1, thres = 0.2;
  for (let i = 0; i < buffer.length / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < buffer.length / 2; i++) {
    if (Math.abs(buffer[buffer.length - i]) < thres) { r2 = buffer.length - i; break; }
  }
  
  buffer = buffer.slice(r1, r2);
  const c = new Array(buffer.length).fill(0);
  
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < buffer.length - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j + i];
    }
  }
  
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  
  let maxval = -1, maxpos = -1;
  for (let i = d; i < buffer.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  
  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);
  
  return sampleRate / T0;
}