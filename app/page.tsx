"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-y-auto overflow-x-hidden bg-rosewood text-parchment font-sans selection:bg-brass selection:text-rosewood scroll-smooth">

      {/*
        FIX: this nav crammed a 1.5x-scaled logo plus 3 links/buttons
        into one row with zero responsive handling — on a phone that
        either wrapped mid-row or squeezed everything together.
        Now: logo + "Open App" (the actual conversion goal) stay
        visible at every size; "Pricing"/"Log In" collapse behind a
        hamburger below sm. Logo itself also scales down on mobile
        instead of staying at its desktop-tuned 1.5x.
      */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative border-b border-slate px-4 sm:px-8 py-3 sm:py-4 z-20 bg-rosewood/80 backdrop-blur-sm sticky top-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-24 sm:h-12 sm:w-36 sm:scale-[1.5] origin-left overflow-hidden">
              <Image
                src="/logo.png"
                alt="Vibechord"
                fill
                sizes="144px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Desktop links — hidden below sm */}
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/premium" className="text-ash hover:text-parchment transition-colors">Pricing</Link>
            <Link href="/login" className="text-ash hover:text-parchment transition-colors">Log In</Link>
            <Link href="/chat" className="rounded-md bg-brass px-5 py-2 font-medium text-rosewood hover:opacity-90 transition-opacity">
              Open App
            </Link>
          </div>

          {/* Mobile: compact "Open App" + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/chat"
              className="rounded-md bg-brass px-3.5 py-2 text-xs font-medium text-rosewood transition-opacity hover:opacity-90 active:scale-95"
            >
              Open App
            </Link>
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="text-ash hover:text-brass transition-colors active:scale-90 p-1"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown for the secondary links */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="sm:hidden overflow-hidden"
            >
              <div className="flex flex-col gap-1 pt-4 pb-1 text-sm">
                <Link
                  href="/premium"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-md px-2 py-2.5 text-ash hover:text-parchment hover:bg-slate/20 transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-md px-2 py-2.5 text-ash hover:text-parchment hover:bg-slate/20 transition-colors"
                >
                  Log In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center shrink-0">

        <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20 pointer-events-none" style={{ maskImage: 'radial-gradient(ellipse at center, white, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at center, white, transparent 70%)' }}></div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="relative z-10 max-w-4xl space-y-8"
        >
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight md:text-7xl leading-tight">
            The intelligent bridge <br />
            between <span className="text-brass">vibe and reality.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-ash leading-relaxed">
            Stop fighting your DAW and start writing. Generate precise guitar tabs, analyze deep music theory, and lock in exact pedal chains and amp configurations before you even pick up your instrument.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/chat" className="w-full sm:w-auto rounded-md bg-brass px-8 py-3.5 text-sm font-medium text-rosewood transition-opacity hover:opacity-90 shadow-lg shadow-brass/10">
              Start a Session
            </Link>
            <Link href="/premium" className="w-full sm:w-auto rounded-md border border-slate px-8 py-3.5 text-sm font-medium text-parchment transition-colors hover:bg-slate/30">
              View Features
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Clean Feature Grid */}
      <section className="relative z-10 border-t border-slate bg-rosewood px-4 sm:px-8 py-20 sm:py-32 shrink-0">
        <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-3">

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="border border-slate p-6 sm:p-8 rounded-xl bg-slate/10 hover:bg-slate/20 transition-colors"
          >
            <div className="h-10 w-10 border border-brass rounded-full flex items-center justify-center mb-6 text-brass font-mono text-sm">01</div>
            <h3 className="font-display text-xl text-parchment mb-3">Theory & Tabs</h3>
            <p className="text-sm text-ash leading-relaxed">
              Instantly output complex chord progressions, scale analysis, and accurate guitar tabs directly into a sleek, side-by-side interface.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="border border-slate p-6 sm:p-8 rounded-xl bg-slate/10 hover:bg-slate/20 transition-colors"
          >
            <div className="h-10 w-10 border border-brass rounded-full flex items-center justify-center mb-6 text-brass font-mono text-sm">02</div>
            <h3 className="font-display text-xl text-parchment mb-3">Genre Specific</h3>
            <p className="text-sm text-ash leading-relaxed">
              Whether you are tracking aggressive heavy metal riffs or dialing in chilled-out lo-fi beats, get the exact stylistic parameters you need.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
            className="border border-slate p-6 sm:p-8 rounded-xl bg-slate/10 hover:bg-slate/20 transition-colors"
          >
            <div className="h-10 w-10 border border-brass rounded-full flex items-center justify-center mb-6 text-brass font-mono text-sm">03</div>
            <h3 className="font-display text-xl text-parchment mb-3">Hardware Mapping</h3>
            <p className="text-sm text-ash leading-relaxed">
              Get precision block configurations for your gear. Map out pedal setups for processors like the Line 6 HX Stomp XL and configure interface routing.
            </p>
          </motion.div>

        </div>
      </section>

    </div>
  );
}