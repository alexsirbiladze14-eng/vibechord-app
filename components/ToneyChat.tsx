"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Send, User } from "lucide-react";
import PitchListener from "./PitchListener";

export type ToneyMessage = {
  role: "user" | "assistant";
  text: string;
};

interface ToneyChatProps {
  messages: ToneyMessage[];
  onSend: (text: string) => void;
  isSending: boolean;
  onMelodyDetected: (notes: string[]) => void;
}

export default function ToneyChat({
  messages,
  onSend,
  isSending,
  onMelodyDetected,
}: ToneyChatProps) {
  const [input, setInput] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col bg-rosewood">
      
      {/* Scrollable Message History */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center space-y-6">
            
            {/* Toney Center Screen Avatar for Empty State */}
            <div className="relative h-24 w-24 rounded-full border-2 border-brass overflow-hidden shadow-lg shadow-brass/5 bg-slate/20">
              <Image 
                src="/toney.png" 
                alt="Toney" 
                fill 
                className="object-cover"
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-display text-parchment">How can I help you write today?</h2>
              <p className="text-ash max-w-md mx-auto text-sm leading-relaxed">
                Ask me for a vibe (&quot;something sad and dreamy&quot;), tell me to tweak the progression, or ask how to lock in a specific guitar tone.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-8">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                
                {/* Assistant Avatar */}
                {msg.role === "assistant" && (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-brass bg-slate/20">
                    <Image src="/toney.png" alt="Toney" fill className="object-cover" />
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-slate/20 text-parchment rounded-tr-sm border border-slate" 
                    : "bg-transparent text-ash"
                }`}>
                  {msg.text}
                </div>

                {/* User Avatar */}
                {msg.role === "user" && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate/30 border border-slate text-ash">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))}

            {/* Toney "Thinking" State */}
            {isSending && (
              <div className="flex gap-4 justify-start animate-pulse">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-brass opacity-70 bg-slate/20">
                  <Image src="/toney.png" alt="Toney Thinking" fill className="object-cover" />
                </div>
                <div className="flex items-center px-4 py-3 text-sm text-ash font-mono">
                  Toney is thinking...
                </div>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate bg-rosewood p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-3 rounded-xl border border-slate bg-slate/10 p-2 shadow-inner focus-within:border-brass/50 focus-within:bg-slate/20 transition-colors">
          <div className="mb-1 shrink-0">
            <PitchListener onMelodyDetected={onMelodyDetected} />
          </div>
          <textarea
            className="max-h-32 min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-sm text-parchment placeholder-ash focus:outline-none"
            placeholder="Describe a mood, a genre, or ask for a specific tone..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brass text-rosewood transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-ash/60">
          Toney can make mistakes. Trust your ears.
        </p>
      </div>
    </div>
  );
}