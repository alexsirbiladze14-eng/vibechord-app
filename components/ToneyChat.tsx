"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import PitchListener from "./PitchListener";

export type ToneyMessage = {
  role: "user" | "assistant";
  text: string;
  animate?: boolean;
};

type Props = {
  messages: ToneyMessage[];
  onSend: (text: string) => void;
  isSending: boolean;
  onMelodyDetected: (notes: string[]) => void;
  headerRight?: React.ReactNode;
};

// Typewriter component
function TypewriterText({
  text,
  animate,
  onType,
}: {
  text: string;
  animate?: boolean;
  onType: () => void;
}) {
  const [displayed, setDisplayed] = useState(animate ? "" : text);

  useEffect(() => {
    if (!animate) {
      setDisplayed(text);
      return;
    }

    let i = 0;
    const typeChar = () => {
      setDisplayed(text.slice(0, i + 1));
      onType();
      i++;
      if (i < text.length) {
        setTimeout(typeChar, Math.random() * 15 + 10);
      }
    };

    const timer = setTimeout(typeChar, 10);
    return () => clearTimeout(timer);
  }, [text, animate, onType]);

  return <span>{displayed}</span>;
}

export default function ToneyChat({
  messages,
  onSend,
  isSending,
  onMelodyDetected,
  headerRight,
}: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, scrollToBottom]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    onSend(draft);
    setDraft("");
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    // FIX #2/#3: this used to rely on the ancestor's h-screen (100vh),
    // which on mobile is taller than what's actually visible once the
    // browser's address bar is on screen — so the input and the
    // newest replies could end up below the fold. The ancestor chain
    // now uses 100dvh (see app/layout.tsx and app/chat/page.tsx), so
    // h-full here tracks the REAL visible height.
    <div className="relative flex h-full flex-col bg-transparent text-parchment">

      {headerRight && (
        <div className="absolute right-4 top-4 z-10">
          {headerRight}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-40 pt-10 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center justify-center text-center space-y-4 min-h-[40vh]"
            >
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full overflow-hidden border-2 border-brass/50 bg-rosewood shadow-lg">
                <Image src="/toney.png" alt="Toney" fill className="object-cover" />
              </div>
              <h2 className="text-2xl font-semibold text-parchment">How can I help you write today?</h2>
              <p className="max-w-md text-sm text-ash">
                Ask me for a vibe (&quot;something sad and dreamy&quot;), to change what&apos;s showing, or how to get a specific guitar tone.
              </p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="flex gap-3 max-w-[85%]">
                  {m.role === "assistant" && (
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-brass/30 mt-1">
                      <Image src="/toney.png" alt="Toney" fill className="object-cover" />
                    </div>
                  )}
                  <div
                    className={`rounded-3xl px-5 py-3.5 text-[15px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-slate/20 text-parchment"
                        : "bg-transparent text-parchment"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <TypewriterText text={m.text} animate={m.animate} onType={scrollToBottom} />
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isSending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full justify-start gap-3"
            >
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-brass/30 mt-1 opacity-70">
                <Image src="/toney.png" alt="Toney" fill className="object-cover" />
              </div>
              <div className="flex items-center gap-1 px-5 py-3.5">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-ash"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/*
        FIX #2: was `pb-6`, no allowance for iOS safe-area / home
        indicator, and depended on the buggy 100vh chain above. Now
        pads for the safe area too, so the send button is never
        underneath the home-indicator strip on notched phones.
      */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-rosewood via-rosewood to-transparent pt-10 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] px-4">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end rounded-3xl bg-rosewood border border-slate focus-within:border-brass transition-colors duration-200 shadow-lg"
          >
            <div className="absolute bottom-2 left-2 flex items-center">
              <div className="text-ash hover:text-brass transition-colors cursor-pointer flex items-center justify-center h-10 w-10 rounded-full hover:bg-slate/30">
                <PitchListener onMelodyDetected={onMelodyDetected} />
              </div>
            </div>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Toney anything..."
              rows={1}
              className="w-full max-h-48 min-h-[56px] resize-none overflow-y-auto bg-transparent py-4 pl-14 pr-14 text-parchment placeholder-ash outline-none"
            />

            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brass text-rosewood transition-all hover:opacity-90 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </button>
            </div>

          </form>
          <p className="mt-3 text-center text-[11px] text-ash">
            Toney can make mistakes. Always double-check your music theory.
          </p>
        </div>
      </div>
    </div>
  );
}
